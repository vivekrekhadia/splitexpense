import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import { calculateGroupBalances } from "@/lib/balance";
import { Types } from "mongoose";

/** GET /api/groups/[groupId]/balances — simplified debt list for the group */
export async function GET(_req: NextRequest, { params }: { params: { groupId: string } }) {
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

    const group = await Group.findById(params.groupId).lean();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const debts = await calculateGroupBalances(params.groupId);

    return NextResponse.json({ success: true, data: debts });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
