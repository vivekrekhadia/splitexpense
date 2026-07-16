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
      className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3 hover:border-[#5BC5A7]/40 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[#5BC5A7]/20 flex items-center justify-center text-[#5BC5A7] font-semibold text-sm shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">{name}</p>
          <p className="text-xs text-gray-400">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 shrink-0"
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
