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
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#5BC5A7]/20 flex items-center justify-center text-[#5BC5A7] font-semibold text-sm shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Name + balance */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A2E] truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{email}</p>
          {!settled && (
            <p className={`text-xs font-medium mt-0.5 ${owesYou ? "text-[#5BC5A7]" : "text-[#FF6B6B]"}`}>
              {owesYou ? `owes you ${formatINR(balance)}` : `you owe ${formatINR(Math.abs(balance))}`}
            </p>
          )}
          {settled && <p className="text-xs text-gray-400 mt-0.5">Settled up ✓</p>}
        </div>

        {/* Settle up button */}
        {!settled && (
          <button
            onClick={() => onSettleUp(id)}
            className="shrink-0 text-xs font-medium px-3 py-2.5 rounded-lg border border-[#5BC5A7] text-[#5BC5A7] hover:bg-[#5BC5A7]/10 active:bg-[#5BC5A7]/20 transition-colors"
          >
            Settle up
          </button>
        )}
      </div>
    </div>
  );
}
