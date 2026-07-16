import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import FriendRequest from "@/models/FriendRequest";
import { RespondFriendRequestSchema } from "@/lib/validations";
import { Types } from "mongoose";

/** PATCH /api/friends/[requestId] — accept or reject a pending friend request */
export async function PATCH(req: NextRequest, { params }: { params: { requestId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = RespondFriendRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { status } = parsed.data;
    const userId = (session.user as { id: string }).id;

    if (!Types.ObjectId.isValid(params.requestId)) {
      return NextResponse.json({ success: false, error: "Invalid request ID" }, { status: 400 });
    }

    await connectDB();

    const friendRequest = await FriendRequest.findById(params.requestId);
    if (!friendRequest) {
      return NextResponse.json({ success: false, error: "Friend request not found" }, { status: 404 });
    }

    // Only the recipient can accept or reject
    if (friendRequest.to.toString() !== userId) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (friendRequest.status !== "pending") {
      return NextResponse.json({ success: false, error: "Request has already been responded to" }, { status: 409 });
    }

    friendRequest.status = status;
    await friendRequest.save();

    return NextResponse.json({
      success: true,
      data: { requestId: friendRequest._id.toString(), status },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
