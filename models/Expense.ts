import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISplit {
  user: Types.ObjectId;
  amount: number;
}

export interface IExpense extends Document {
  description: string;
  amount: number;
  paidBy: Types.ObjectId;
  group: Types.ObjectId | null;
  splits: ISplit[];
  splitType: "equal" | "exact" | "percentage";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SplitSchema = new Schema<ISplit>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const ExpenseSchema = new Schema<IExpense>(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    splits: { type: [SplitSchema], required: true },
    splitType: { type: String, enum: ["equal", "exact", "percentage"], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const Expense: Model<IExpense> = mongoose.models.Expense ?? mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
