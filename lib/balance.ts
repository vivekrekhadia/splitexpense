import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import Settlement from "@/models/Settlement";
import Group from "@/models/Group";

export interface BalanceResult {
  /** Positive: userB owes userA. Negative: userA owes userB. */
  net: number;
  owedToA: number;
  owedByA: number;
}

export interface DebtEntry {
  from: string; // userId (debtor)
  to: string; // userId (creditor)
  amount: number;
}

/**
 * Calculate the net balance between two users across all shared expenses and settlements.
 *
 * Positive result → userB owes userA.
 * Negative result → userA owes userB.
 */
export async function calculateBalance(
  userAId: string | Types.ObjectId,
  userBId: string | Types.ObjectId,
): Promise<BalanceResult> {
  await connectDB();

  const aId = new Types.ObjectId(userAId.toString());
  const bId = new Types.ObjectId(userBId.toString());

  // Fetch all expenses where both A and B appear in splits
  const expenses = await Expense.find({
    "splits.user": { $all: [aId, bId] },
  }).lean();

  let owedToA = 0; // amount B owes A
  let owedByA = 0; // amount A owes B

  for (const expense of expenses) {
    const paidByA = expense.paidBy.toString() === aId.toString();
    const paidByB = expense.paidBy.toString() === bId.toString();

    if (paidByA) {
      // A paid — B owes A whatever B's split is
      const bSplit = expense.splits.find((s) => s.user.toString() === bId.toString());
      if (bSplit) owedToA += bSplit.amount;
    } else if (paidByB) {
      // B paid — A owes B whatever A's split is
      const aSplit = expense.splits.find((s) => s.user.toString() === aId.toString());
      if (aSplit) owedByA += aSplit.amount;
    }
  }

  // Fetch settlements between A and B (in either direction)
  const settlements = await Settlement.find({
    $or: [
      { paidBy: aId, paidTo: bId },
      { paidBy: bId, paidTo: aId },
    ],
  }).lean();

  for (const settlement of settlements) {
    if (settlement.paidBy.toString() === bId.toString()) {
      // B paid A → reduces what B owes A
      owedToA -= settlement.amount;
    } else {
      // A paid B → reduces what A owes B
      owedByA -= settlement.amount;
    }
  }

  return {
    net: owedToA - owedByA,
    owedToA,
    owedByA,
  };
}

/**
 * Calculate simplified debts for all members of a group.
 *
 * Returns a minimal list of DebtEntry objects representing who owes whom,
 * using a greedy debt-simplification algorithm.
 */
export async function calculateGroupBalances(groupId: string | Types.ObjectId): Promise<DebtEntry[]> {
  await connectDB();

  const gId = new Types.ObjectId(groupId.toString());

  const group = await Group.findById(gId).lean();
  if (!group) return [];

  const memberIds = group.members.map((m: Types.ObjectId) => m.toString());

  // Fetch all group expenses and settlements
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: gId }).lean(),
    Settlement.find({ group: gId }).lean(),
  ]);

  // Build a net balance map: balances[userId] = net amount (positive = owed money, negative = owes money)
  const balances: Record<string, number> = {};
  for (const id of memberIds) balances[id] = 0;

  for (const expense of expenses) {
    const payerId = expense.paidBy.toString();
    for (const split of expense.splits) {
      const splitUserId = split.user.toString();
      if (splitUserId === payerId) continue; // payer's own share doesn't create a debt
      // payer is owed split.amount by splitUser
      if (payerId in balances) balances[payerId] += split.amount;
      if (splitUserId in balances) balances[splitUserId] -= split.amount;
    }
  }

  for (const settlement of settlements) {
    const fromId = settlement.paidBy.toString();
    const toId = settlement.paidTo.toString();
    // payer reduces their debt (increases their balance), receiver reduces what they're owed
    if (fromId in balances) balances[fromId] += settlement.amount;
    if (toId in balances) balances[toId] -= settlement.amount;
  }

  // Greedy simplification: match largest creditors with largest debtors
  return simplifyDebts(balances);
}

/**
 * Greedy debt simplification algorithm.
 * Given a map of userId → net balance, produces a minimal list of transfers.
 */
function simplifyDebts(balances: Record<string, number>): DebtEntry[] {
  const debts: DebtEntry[] = [];

  // Split into creditors (positive balance) and debtors (negative balance)
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0.001)
    .map(([id, amount]) => ({ id, amount }));

  const debtors = Object.entries(balances)
    .filter(([, v]) => v < -0.001)
    .map(([id, amount]) => ({ id, amount: -amount })); // store as positive

  // Sort descending for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const transfer = Math.min(credit.amount, debt.amount);

    debts.push({
      from: debt.id,
      to: credit.id,
      amount: Math.round(transfer * 100) / 100,
    });

    credit.amount -= transfer;
    debt.amount -= transfer;

    if (credit.amount < 0.001) ci++;
    if (debt.amount < 0.001) di++;
  }

  return debts;
}
