import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFriendRequest extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const FriendRequest: Model<IFriendRequest> =
  mongoose.models.FriendRequest ?? mongoose.model<IFriendRequest>("FriendRequest", FriendRequestSchema);

export default FriendRequest;
