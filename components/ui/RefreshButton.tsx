"use client";

import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: Date | null;
}

export default function RefreshButton({ onRefresh, loading, lastUpdated }: RefreshButtonProps) {
  const timeLabel = lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="flex items-center gap-1.5">
      {timeLabel && <span className="text-xs text-gray-400 hidden sm:inline">Updated {timeLabel}</span>}
      <button
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh"
        className="p-2 rounded-lg text-gray-400 hover:text-[#5BC5A7] hover:bg-gray-100 transition-colors disabled:opacity-40"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );
}
