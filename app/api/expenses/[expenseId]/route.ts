import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Group from "@/models/Group";
import User from "@/models/User";
import { UpdateExpenseSchema } from "@/lib/validations";
import { Types } from "mongoose";

type Params = { params: { expenseId: string } };

function formatExpense(e: Record<string, unknown>) {
  return {
    id: (e._id as Types.ObjectId).toString(),
    description: e.description as string,
    amount: e.amount as number,
    paidBy: {
      id: (e.paidBy as { _id: Types.ObjectId; name: string })._id.toString(),
      name: (e.paidBy as { _id: Types.ObjectId; name: string }).name,
    },
    createdBy: {
      id: (e.createdBy as { _id: Types.ObjectId; name: string })._id.toString(),
      name: (e.createdBy as { _id: Types.ObjectId; name: string }).name,
    },
    splits: (e.splits as { user: { _id: Types.ObjectId; name: string }; amount: number }[]).map((s) => ({
      user: s.user._id.toString(),
      name: s.user.name,
      amount: s.amount,
    })),
    splitType: e.splitType as string,
    group: e.group ? (e.group as Types.ObjectId).toString() : null,
    createdAt: e.createdAt as Date,
    updatedAt: e.updatedAt as Date,
  };
}

/** GET /api/expenses/[expenseId] */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.expenseId)) {
    return NextResponse.json({ success: false, error: "Invalid expense ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const userId = (session.user as { id: string }).id;

    const expense = await Expense.findById(params.expenseId)
      .populate("paidBy", "_id name")
      .populate("createdBy", "_id name")
      .populate("splits.user", "_id name")
      .lean();

    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    // Check access: user must be in splits or be paidBy or createdBy
    const userInSplits = (expense.splits as { user: { _id: Types.ObjectId } }[]).some(
      (s) => s.user._id.toString() === userId,
    );
    const isPayer = (expense.paidBy as unknown as { _id: Types.ObjectId })._id.toString() === userId;
    const isCreator = (expense.createdBy as unknown as { _id: Types.ObjectId })._id.toString() === userId;

    if (!userInSplits && !isPayer && !isCreator) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: formatExpense(expense as unknown as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** PATCH /api/expenses/[expenseId] — edit, only by creator */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.expenseId)) {
    return NextResponse.json({ success: false, error: "Invalid expense ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const userId = (session.user as { id: string }).id;

    const expense = await Expense.findById(params.expenseId);
    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    if (expense.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the expense creator can edit this expense" },
        { status: 403 },
      );
    }

    const { description, amount, paidBy, group, splits, splitType } = parsed.data;

    // If splits and amount are both provided, validate they sum correctly
    const newAmount = amount ?? expense.amount;
    if (splits) {
      const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitTotal - newAmount) > 0.01) {
        return NextResponse.json(
          { success: false, error: "Split amounts must sum to the total expense amount" },
          { status: 400 },
        );
      }
    }

    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = amount;
    if (paidBy !== undefined) {
      if (!Types.ObjectId.isValid(paidBy)) {
        return NextResponse.json({ success: false, error: "Invalid payer ID" }, { status: 400 });
      }
      const payer = await User.findById(paidBy).lean();
      if (!payer) return NextResponse.json({ success: false, error: "Payer not found" }, { status: 404 });
      expense.paidBy = new Types.ObjectId(paidBy);
    }
    if (group !== undefined) {
      if (group === null) {
        expense.group = null;
      } else {
        if (!Types.ObjectId.isValid(group)) {
          return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
        }
        const groupDoc = await Group.findById(group).lean();
        if (!groupDoc) return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
        expense.group = new Types.ObjectId(group);
      }
    }
    if (splits !== undefined) {
      expense.splits = splits.map((s) => ({ user: new Types.ObjectId(s.user), amount: s.amount }));
    }
    if (splitType !== undefined) expense.splitType = splitType;

    await expense.save();

    const updated = await Expense.findById(expense._id)
      .populate("paidBy", "_id name")
      .populate("createdBy", "_id name")
      .populate("splits.user", "_id name")
      .lean();

    return NextResponse.json({ success: true, data: formatExpense(updated as unknown as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** DELETE /api/expenses/[expenseId] — only by creator */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!Types.ObjectId.isValid(params.expenseId)) {
    return NextResponse.json({ success: false, error: "Invalid expense ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const userId = (session.user as { id: string }).id;

    const expense = await Expense.findById(params.expenseId);
    if (!expense) {
      return NextResponse.json({ success: false, error: "Expense not found" }, { status: 404 });
    }

    if (expense.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the expense creator can delete this expense" },
        { status: 403 },
      );
    }

    await expense.deleteOne();

    return NextResponse.json({ success: true, data: { id: params.expenseId } });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
