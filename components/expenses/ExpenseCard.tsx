"use client";

import Link from "next/link";
import { formatINR } from "@/lib/currency";

interface ExpenseCardProps {
  id: string;
  description: string;
  amount: number;
  paidByName: string;
  userShare: number; // current user's split amount
  createdAt: string;
}

export default function ExpenseCard({ id, description, amount, paidByName, userShare, createdAt }: ExpenseCardProps) {
  const date = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/expenses/${id}`}
      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 hover:border-[#5BC5A7]/40 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
          {date}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">{description}</p>
          <p className="text-xs text-gray-400 truncate">
            {paidByName} paid {formatINR(amount)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-[#1A1A2E]">{formatINR(userShare)}</p>
        <p className="text-xs text-gray-400">your share</p>
      </div>
    </Link>
  );
}
