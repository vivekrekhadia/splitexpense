import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Group from "@/models/Group";
import User from "@/models/User";
import { CreateGroupSchema } from "@/lib/validations";
import { Types } from "mongoose";

/** GET /api/groups — list groups the current user belongs to */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const userId = new Types.ObjectId((session.user as { id: string }).id);

    const groups = await Group.find({ members: userId })
      .populate("members", "_id name email")
      .populate("createdBy", "_id name email")
      .sort({ createdAt: -1 })
      .lean();

    const data = groups.map((g) => ({
      id: g._id.toString(),
      name: g.name,
      createdBy: {
        id: (g.createdBy as unknown as { _id: Types.ObjectId; name: string; email: string })._id.toString(),
        name: (g.createdBy as unknown as { _id: Types.ObjectId; name: string; email: string }).name,
      },
      members: (g.members as unknown as { _id: Types.ObjectId; name: string; email: string }[]).map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
      })),
      createdAt: g.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}

/** POST /api/groups — create a new group */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, memberEmails } = parsed.data;
    const userId = (session.user as { id: string }).id;

    await connectDB();

    // Resolve member emails to user IDs
    const memberIds: Types.ObjectId[] = [new Types.ObjectId(userId)];
    const notFound: string[] = [];

    for (const email of memberEmails) {
      const user = await User.findOne({ email: email.toLowerCase() }).lean();
      if (!user) {
        notFound.push(email);
      } else {
        const uid = user._id.toString();
        if (!memberIds.some((id) => id.toString() === uid)) {
          memberIds.push(new Types.ObjectId(uid));
        }
      }
    }

    if (notFound.length > 0) {
      return NextResponse.json(
        { success: false, error: `No users found for: ${notFound.join(", ")}` },
        { status: 404 },
      );
    }

    const group = await Group.create({
      name,
      createdBy: new Types.ObjectId(userId),
      members: memberIds,
    });

    const populated = await Group.findById(group._id)
      .populate("members", "_id name email")
      .populate("createdBy", "_id name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          id: populated!._id.toString(),
          name: populated!.name,
          createdBy: {
            id: (populated!.createdBy as unknown as { _id: Types.ObjectId; name: string })._id.toString(),
            name: (populated!.createdBy as unknown as { _id: Types.ObjectId; name: string }).name,
          },
          members: (populated!.members as unknown as { _id: Types.ObjectId; name: string; email: string }[]).map(
            (m) => ({ id: m._id.toString(), name: m.name, email: m.email }),
          ),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
