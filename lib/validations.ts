import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export const SendFriendRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const RespondFriendRequestSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export type SendFriendRequestInput = z.infer<typeof SendFriendRequestSchema>;
export type RespondFriendRequestInput = z.infer<typeof RespondFriendRequestSchema>;

export const CreateExpenseSchema = z.object({
  description: z.string().min(1, "Description is required").trim(),
  amount: z.number().positive("Amount must be positive"),
  paidBy: z.string().min(1, "Payer is required"),
  group: z.string().nullable().optional(),
  splits: z
    .array(
      z.object({
        user: z.string().min(1),
        amount: z.number().min(0),
      }),
    )
    .min(1, "At least one split is required"),
  splitType: z.enum(["equal", "exact", "percentage"]),
});

export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;

export const CreateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").trim(),
  memberEmails: z.array(z.string().email("Invalid email")).optional().default([]),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").trim(),
});

export const AddMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export const CreateSettlementSchema = z.object({
  paidTo: z.string().min(1, "Recipient is required"),
  amount: z.number().positive("Amount must be positive"),
  group: z.string().nullable().optional(),
});

export type CreateSettlementInput = z.infer<typeof CreateSettlementSchema>;
