import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Settlement from "@/models/Settlement";
import User from "@/models/User";
import { calculateBalance } from "@/lib/balance";
import { CreateSettlementSchema } from "@/lib/validations";
import { Types } from "mongoose";

/** POST /api/settlements — record a settlement between two users */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateSettlementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { paidTo, amount, group } = parsed.data;
    // `force` allows bypassing the overpayment check after user confirms (Requirement 7.3)
    const force = body.force === true;
    const userId = (session.user as { id: string }).id;

    if (paidTo === userId) {
      return NextResponse.json({ success: false, error: "Cannot settle with yourself" }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(paidTo)) {
      return NextResponse.json({ success: false, error: "Invalid recipient ID" }, { status: 400 });
    }

    await connectDB();

    // Verify recipient exists
    const recipient = await User.findById(paidTo).lean();
    if (!recipient) {
      return NextResponse.json({ success: false, error: "Recipient not found" }, { status: 404 });
    }

    // Overpayment check: compare against the outstanding balance
    // calculateBalance(A, B).net: positive = B owes A, negative = A owes B
    // Here currentUser is A and paidTo is B, so A owes B when net < 0
    const balance = await calculateBalance(userId, paidTo);
    // Amount the current user owes the recipient (positive = current user owes recipient)
    const amountOwed = -balance.net; // flip sign: negative net means A owes B

    if (amount > amountOwed + 0.001 && !force) {
      // Return 422 with overpayment warning flag (Requirement 7.3)
      return NextResponse.json(
        {
          success: false,
          error: "Settlement amount exceeds outstanding balance",
          overpayment: true,
          amountOwed: Math.max(amountOwed, 0),
        },
        { status: 422 },
      );
    }

    const settlement = await Settlement.create({
      paidBy: new Types.ObjectId(userId),
      paidTo: new Types.ObjectId(paidTo),
      amount,
      group: group ? new Types.ObjectId(group) : null,
      createdBy: new Types.ObjectId(userId),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: settlement._id.toString(),
          paidBy: userId,
          paidTo,
          amount: settlement.amount,
          group: settlement.group?.toString() ?? null,
          createdAt: settlement.createdAt,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
