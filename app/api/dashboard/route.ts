import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import FriendRequest from "@/models/FriendRequest";
import User from "@/models/User";
import { calculateBalance } from "@/lib/balance";
import { Types } from "mongoose";

export interface BalanceSummaryItem {
  userId: string;
  name: string;
  /** positive = they owe you, negative = you owe them */
  balance: number;
}

export interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  otherPartyName: string;
  /** positive = you are owed / received, negative = you owe / paid */
  direction: number;
  createdAt: string;
}

/** GET /api/dashboard — aggregated balances + last 10 activity events */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const userId = (session.user as { id: string }).id;
    const userObjId = new Types.ObjectId(userId);

    // ── 1. Find all friends (accepted friend requests) ──────────────────────
    const acceptedRequests = await FriendRequest.find({
      $or: [{ from: userObjId }, { to: userObjId }],
      status: "accepted",
    }).lean();

    const friendIds = acceptedRequests.map((r) => (r.from.toString() === userId ? r.to.toString() : r.from.toString()));

    // ── 2. Compute pairwise balances with each friend ────────────────────────
    const balanceItems: BalanceSummaryItem[] = [];

    if (friendIds.length > 0) {
      const friendUsers = await User.find({ _id: { $in: friendIds } })
        .select("_id name")
        .lean();

      await Promise.all(
        friendUsers.map(async (friend) => {
          const bal = await calculateBalance(userId, friend._id.toString());
          if (Math.abs(bal.net) >= 0.01) {
            balanceItems.push({
              userId: friend._id.toString(),
              name: friend.name,
              balance: bal.net, // positive = friend owes me, negative = I owe friend
            });
          }
        }),
      );
    }

    // Sort: biggest absolute balance first
    balanceItems.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    // ── 3. Aggregate totals ──────────────────────────────────────────────────
    const totalOwed = balanceItems.filter((b) => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0);
    const totalOwedToMe = balanceItems.filter((b) => b.balance > 0).reduce((s, b) => s + b.balance, 0);

    // ── 4. Build activity feed (last 10 events involving current user) ────────
    const [expenses, settlements] = await Promise.all([
      Expense.find({
        $or: [{ paidBy: userObjId }, { "splits.user": userObjId }],
      })
        .populate("paidBy", "_id name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),

      Settlement.find({
        $or: [{ paidBy: userObjId }, { paidTo: userObjId }],
      })
        .populate("paidBy", "_id name")
        .populate("paidTo", "_id name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const activityItems: ActivityItem[] = [];

    for (const expense of expenses) {
      const paidBy = expense.paidBy as unknown as { _id: Types.ObjectId; name: string };
      const iPaid = paidBy._id.toString() === userId;
      const mySplit = expense.splits.find((s) => s.user.toString() === userId);
      const myShare = mySplit?.amount ?? 0;

      activityItems.push({
        id: expense._id.toString(),
        type: "expense",
        description: expense.description,
        amount: expense.amount,
        otherPartyName: iPaid ? "you paid" : paidBy.name,
        // If I paid, I'm owed (positive); if someone else paid, I owe my share (negative)
        direction: iPaid ? expense.amount - myShare : -myShare,
        createdAt: expense.createdAt.toISOString(),
      });
    }

    for (const settlement of settlements) {
      const paidBy = settlement.paidBy as unknown as { _id: Types.ObjectId; name: string };
      const paidTo = settlement.paidTo as unknown as { _id: Types.ObjectId; name: string };
      const iPaid = paidBy._id.toString() === userId;

      activityItems.push({
        id: settlement._id.toString(),
        type: "settlement",
        description: iPaid ? `You paid ${paidTo.name}` : `${paidBy.name} paid you`,
        amount: settlement.amount,
        otherPartyName: iPaid ? paidTo.name : paidBy.name,
        direction: iPaid ? -settlement.amount : settlement.amount,
        createdAt: settlement.createdAt.toISOString(),
      });
    }

    // Sort by date descending, take last 10
    activityItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentActivity = activityItems.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalOwedToMe: Math.round(totalOwedToMe * 100) / 100,
        balances: balanceItems,
        activity: recentActivity,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
