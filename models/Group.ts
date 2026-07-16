import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IGroup extends Document {
  name: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const Group: Model<IGroup> = mongoose.models.Group ?? mongoose.model<IGroup>("Group", GroupSchema);

export default Group;
