import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { UpdateGroupSchema } from "@/lib/validations";
import { Types } from "mongoose";

type Params = { params: { groupId: string } };

/** GET /api/groups/[groupId] — group detail */
export async function GET(_req: NextRequest, { params }: Params) {
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

    const group = await Group.findById(params.groupId)
      .populate("members", "_id name email")
      .populate("createdBy", "_id name email")
      .lean();

    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.some((m) => {
      const member = m as unknown as { _id: Types.ObjectId };
      return member._id.toString() === userId;
    });

    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: group._id.toString(),
        name: group.name,
        createdBy: {
          id: (group.createdBy as unknown as { _id: Types.ObjectId; name: string; email: string })._id.toString(),
          name: (group.createdBy as unknown as { _id: Types.ObjectId; name: string; email: string }).name,
          email: (group.createdBy as unknown as { _id: Types.ObjectId; name: string; email: string }).email,
        },
        members: (group.members as unknown as { _id: Types.ObjectId; name: string; email: string }[]).map((m) => ({
          id: m._id.toString(),
          name: m.name,
          email: m.email,
        })),
        createdAt: group.createdAt,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** PATCH /api/groups/[groupId] — update group name (creator only) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.groupId)) {
    return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const userId = (session.user as { id: string }).id;

    const group = await Group.findById(params.groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    if (group.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can update the group" },
        { status: 403 },
      );
    }

    group.name = parsed.data.name;
    await group.save();

    return NextResponse.json({ success: true, data: { id: group._id.toString(), name: group.name } });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** DELETE /api/groups/[groupId] — delete group (creator only) */
export async function DELETE(_req: NextRequest, { params }: Params) {
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

    const group = await Group.findById(params.groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    if (group.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the group creator can delete the group" },
        { status: 403 },
      );
    }

    await group.deleteOne();

    return NextResponse.json({ success: true, data: { id: params.groupId } });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
