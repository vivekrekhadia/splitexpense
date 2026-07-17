"use client";

import Link from "next/link";

interface GroupCardProps {
  id: string;
  name: string;
  memberCount: number;
}

export default function GroupCard({ id, name, memberCount }: GroupCardProps) {
  return (
    <Link
      href={`/groups/${id}`}
      className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] hover:border-emerald-500/20 transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/5">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>
      </div>
      
      {/* Arrow Indicator */}
      <svg
        className="w-4 h-4 text-slate-500 shrink-0 group-hover:text-slate-300 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
