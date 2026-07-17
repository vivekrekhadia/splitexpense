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
  const dateObj = new Date(createdAt);
  const month = dateObj.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const day = dateObj.toLocaleDateString(undefined, { day: "numeric" });

  return (
    <Link
      href={`/expenses/${id}`}
      className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] hover:border-emerald-500/20 transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Compact Calendar/Receipt icon */}
        <div className="w-10 h-10 rounded-full bg-slate-800/85 border border-slate-700/40 flex flex-col items-center justify-center shrink-0 shadow-sm leading-none py-1">
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{month}</span>
          <span className="text-sm text-slate-100 font-bold mt-0.5">{day}</span>
        </div>
        
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{description}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {paidByName} paid <span className="font-semibold text-slate-300">{formatINR(amount)}</span>
          </p>
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-100">{formatINR(userShare)}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">your share</p>
      </div>
    </Link>
  );
}
