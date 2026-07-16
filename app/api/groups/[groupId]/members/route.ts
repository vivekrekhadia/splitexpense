import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import User from "@/models/User";
import { calculateGroupBalances } from "@/lib/balance";
import { AddMemberSchema } from "@/lib/validations";
import { Types } from "mongoose";

type Params = { params: { groupId: string } };

/** POST /api/groups/[groupId]/members — add a member by email */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.groupId)) {
    return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const userId = (session.user as { id: string }).id;

    const group = await Group.findById(params.groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    // Only members can add other members
    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "No user found with that email" }, { status: 404 });
    }

    const targetId = targetUser._id.toString();
    const alreadyMember = group.members.some((m) => m.toString() === targetId);
    if (alreadyMember) {
      return NextResponse.json({ success: false, error: "User is already a member of this group" }, { status: 409 });
    }

    group.members.push(new Types.ObjectId(targetId));
    await group.save();

    return NextResponse.json(
      {
        success: true,
        data: { id: targetId, name: targetUser.name, email: targetUser.email },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** DELETE /api/groups/[groupId]/members — remove the current user (leave group) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.groupId)) {
    return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const userId = (session.user as { id: string }).id;

    // Allow removing a specific member (by body.userId) if provided, otherwise leave self
    let body: { userId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // no body — default to self-removal
    }
    const targetUserId = body.userId ?? userId;

    // Only the group creator can remove others; any member can remove themselves
    const group = await Group.findById(params.groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.some((m) => m.toString() === targetUserId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "User is not a member of this group" }, { status: 404 });
    }

    if (targetUserId !== userId && group.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can remove other members" },
        { status: 403 },
      );
    }

    // Check balance: member must be settled before leaving
    const debts = await calculateGroupBalances(params.groupId);
    const hasOutstandingBalance = debts.some((d) => d.from === targetUserId || d.to === targetUserId);

    if (hasOutstandingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: "Member has an outstanding balance and must settle up before leaving",
        },
        { status: 422 },
      );
    }

    group.members = group.members.filter((m) => m.toString() !== targetUserId);
    await group.save();

    return NextResponse.json({ success: true, data: { removed: targetUserId } });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
