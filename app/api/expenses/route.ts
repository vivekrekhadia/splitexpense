import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Group from "@/models/Group";
import User from "@/models/User";
import { CreateExpenseSchema } from "@/lib/validations";
import { Types } from "mongoose";

/** GET /api/expenses?groupId=... — list expenses for a group */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId || !Types.ObjectId.isValid(groupId)) {
    return NextResponse.json({ success: false, error: "Valid groupId is required" }, { status: 400 });
  }

  try {
    await connectDB();
    const userId = (session.user as { id: string }).id;

    // Verify the user is a member of the group
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }
    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const expenses = await Expense.find({ group: new Types.ObjectId(groupId) })
      .populate("paidBy", "_id name")
      .populate("splits.user", "_id name")
      .sort({ createdAt: -1 })
      .lean();

    const data = expenses.map((e) => ({
      id: e._id.toString(),
      description: e.description,
      amount: e.amount,
      paidBy: {
        id: (e.paidBy as unknown as { _id: Types.ObjectId; name: string })._id.toString(),
        name: (e.paidBy as unknown as { _id: Types.ObjectId; name: string }).name,
      },
      splits: e.splits.map((s) => ({
        user: (s.user as unknown as { _id: Types.ObjectId })._id?.toString() ?? s.user.toString(),
        amount: s.amount,
      })),
      splitType: e.splitType,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** POST /api/expenses — create a new expense */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { description, amount, paidBy, group, splits, splitType } = parsed.data;
    const userId = (session.user as { id: string }).id;

    // Validate split totals equal the expense amount (within floating point tolerance)
    const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitTotal - amount) > 0.01) {
      return NextResponse.json(
        { success: false, error: "Split amounts must sum to the total expense amount" },
        { status: 400 },
      );
    }

    await connectDB();

    // Verify payer exists
    if (!Types.ObjectId.isValid(paidBy)) {
      return NextResponse.json({ success: false, error: "Invalid payer ID" }, { status: 400 });
    }
    const payer = await User.findById(paidBy).lean();
    if (!payer) {
      return NextResponse.json({ success: false, error: "Payer not found" }, { status: 404 });
    }

    // Verify group membership if group is provided
    if (group) {
      if (!Types.ObjectId.isValid(group)) {
        return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
      }
      const groupDoc = await Group.findById(group).lean();
      if (!groupDoc) {
        return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
      }
      const isMember = groupDoc.members.some((m) => m.toString() === userId);
      if (!isMember) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const expense = await Expense.create({
      description,
      amount,
      paidBy: new Types.ObjectId(paidBy),
      group: group ? new Types.ObjectId(group) : null,
      splits: splits.map((s) => ({ user: new Types.ObjectId(s.user), amount: s.amount })),
      splitType,
      createdBy: new Types.ObjectId(userId),
    });

    const populated = await Expense.findById(expense._id)
      .populate("paidBy", "_id name")
      .populate("createdBy", "_id name")
      .populate("splits.user", "_id name")
      .lean();

    const e = populated!;
    return NextResponse.json(
      {
        success: true,
        data: {
          id: e._id.toString(),
          description: e.description,
          amount: e.amount,
          paidBy: {
            id: (e.paidBy as unknown as { _id: Types.ObjectId; name: string })._id.toString(),
            name: (e.paidBy as unknown as { _id: Types.ObjectId; name: string }).name,
          },
          splits: e.splits.map((s) => ({
            user: (s.user as unknown as { _id: Types.ObjectId; name: string })._id.toString(),
            name: (s.user as unknown as { _id: Types.ObjectId; name: string }).name,
            amount: s.amount,
          })),
          splitType: e.splitType,
          group: e.group?.toString() ?? null,
          createdAt: e.createdAt,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
