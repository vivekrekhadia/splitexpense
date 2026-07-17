"use client";

import { formatINR } from "@/lib/currency";

interface FriendCardProps {
  id: string;
  name: string;
  email: string;
  balance: number; // positive = friend owes you, negative = you owe friend
  onSettleUp: (friendId: string) => void;
}

export default function FriendCard({ id, name, email, balance, onSettleUp }: FriendCardProps) {
  const settled = Math.abs(balance) < 0.01;
  const owesYou = balance > 0;

  return (
    <div className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3.5 hover:bg-white/[0.02] transition-all duration-200">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
          settled 
            ? "bg-slate-800/80 text-slate-400 border-slate-700/40 shadow-sm" 
            : owesYou 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-md shadow-emerald-500/5" 
              : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-md shadow-rose-500/5"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Name + Balance Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{name}</p>
          <p className="text-xs text-slate-400 truncate">{email}</p>
          {!settled && (
            <p className={`text-[11px] font-semibold mt-0.5 tracking-wide ${owesYou ? "text-emerald-400" : "text-rose-400"}`}>
              {owesYou ? `owes you ${formatINR(balance)}` : `you owe ${formatINR(Math.abs(balance))}`}
            </p>
          )}
          {settled && <p className="text-[11px] font-semibold text-slate-400 mt-0.5 tracking-wide">Settled up ✓</p>}
        </div>

        {/* Settle Up Button */}
        {!settled && (
          <button
            onClick={() => onSettleUp(id)}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 active:scale-95 transition-all shadow-sm shadow-emerald-500/5"
          >
            Settle up
          </button>
        )}
      </div>
    </div>
  );
}
