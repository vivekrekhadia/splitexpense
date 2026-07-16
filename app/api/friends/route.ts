import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import FriendRequest from "@/models/FriendRequest";
import { calculateBalance } from "@/lib/balance";
import { SendFriendRequestSchema } from "@/lib/validations";
import { Types } from "mongoose";

/** GET /api/friends — list accepted friends with pairwise balances */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const userId = (session.user as { id: string }).id;
    const userObjId = new Types.ObjectId(userId);

    // Find all accepted friend requests involving this user
    const accepted = await FriendRequest.find({
      $or: [{ from: userObjId }, { to: userObjId }],
      status: "accepted",
    }).lean();

    // Determine the friend's id from each request
    const friendIds = accepted.map((r) => (r.from.toString() === userId ? r.to : r.from));

    // Fetch friend user documents
    const friends = await User.find({ _id: { $in: friendIds } })
      .select("_id name email")
      .lean();

    // Compute balance for each friend in parallel
    const friendsWithBalances = await Promise.all(
      friends.map(async (friend) => {
        const balance = await calculateBalance(userId, friend._id.toString());
        return {
          id: friend._id.toString(),
          name: friend.name,
          email: friend.email,
          balance: balance.net, // positive = friend owes current user, negative = current user owes friend
        };
      }),
    );

    // Also return pending requests sent to the current user
    const pendingReceived = await FriendRequest.find({
      to: userObjId,
      status: "pending",
    })
      .populate("from", "_id name email")
      .lean();

    const pendingRequests = pendingReceived.map((r) => {
      const from = r.from as unknown as { _id: Types.ObjectId; name: string; email: string };
      return {
        requestId: r._id.toString(),
        from: {
          id: from._id.toString(),
          name: from.name,
          email: from.email,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: { friends: friendsWithBalances, pendingRequests },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** POST /api/friends — send a friend request by email */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = SendFriendRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email } = parsed.data;
    const userId = (session.user as { id: string }).id;

    await connectDB();

    // Find target user
    const targetUser = await User.findOne({ email: email.toLowerCase() }).lean();
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "No user found with that email" }, { status: 404 });
    }

    const targetId = targetUser._id.toString();

    if (targetId === userId) {
      return NextResponse.json(
        { success: false, error: "You cannot send a friend request to yourself" },
        { status: 400 },
      );
    }

    const userObjId = new Types.ObjectId(userId);
    const targetObjId = new Types.ObjectId(targetId);

    // Check if a relationship already exists
    const existing = await FriendRequest.findOne({
      $or: [
        { from: userObjId, to: targetObjId },
        { from: targetObjId, to: userObjId },
      ],
    }).lean();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ success: false, error: "You are already friends" }, { status: 409 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ success: false, error: "A friend request already exists" }, { status: 409 });
      }
    }

    const request = await FriendRequest.create({
      from: userObjId,
      to: targetObjId,
      status: "pending",
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          requestId: request._id.toString(),
          to: { id: targetId, name: targetUser.name, email: targetUser.email },
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
