import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISettlement extends Document {
  paidBy: Types.ObjectId;
  paidTo: Types.ObjectId;
  amount: number;
  group: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paidTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const Settlement: Model<ISettlement> =
  mongoose.models.Settlement ?? mongoose.model<ISettlement>("Settlement", SettlementSchema);

export default Settlement;
