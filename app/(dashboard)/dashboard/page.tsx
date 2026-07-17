"use client";

import { useState, useEffect, useCallback } from "react";
import SettleUpModal from "@/components/settlements/SettleUpModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import { formatINR } from "@/lib/currency";
import RefreshButton from "@/components/ui/RefreshButton";

interface BalanceSummaryItem {
  userId: string;
  name: string;
  balance: number; // positive = they owe me, negative = I owe them
}

interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  description: string;
  amount: number;
  otherPartyName: string;
  direction: number;
  createdAt: string;
}

interface DashboardData {
  totalOwed: number;
  totalOwedToMe: number;
  balances: BalanceSummaryItem[];
  activity: ActivityItem[];
}

interface SettleTarget {
  userId: string;
  name: string;
  amountOwed: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { showToast } = useToast();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      } else {
        const msg = json.error ?? "Failed to load dashboard";
        setError(msg);
        showToast(msg, "error");
      }
    } catch {
      const msg = "Something went wrong. Please try again.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isEmpty = !loading && data && data.balances.length === 0 && data.activity.length === 0;

  function handleSettleUp(item: BalanceSummaryItem) {
    // Only show settle-up when current user owes (negative balance)
    if (item.balance >= 0) return;
    setSettleTarget({
      userId: item.userId,
      name: item.name,
      amountOwed: Math.abs(item.balance),
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">Dashboard</h1>
        <RefreshButton onRefresh={fetchDashboard} loading={loading} lastUpdated={lastUpdated} />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-rose-400 shrink-0 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="underline font-semibold hover:no-underline text-rose-300">
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 shrink-0">
        <SummaryCard label="You owe" amount={loading ? null : (data?.totalOwed ?? 0)} color="red" />
        <SummaryCard label="You are owed" amount={loading ? null : (data?.totalOwedToMe ?? 0)} color="green" />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto pb-6 min-h-0 pr-0.5">
        {/* Empty state */}
        {isEmpty && (
          <div className="glass-panel rounded-2xl px-6 py-12 text-center mb-6 relative overflow-hidden border-white/[0.04]">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <p className="text-3xl mb-4">🎉</p>
            <p className="text-slate-100 font-semibold mb-1 tracking-wide">You&apos;re all settled up!</p>
            <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
              Add friends and create groups to start splitting expenses easily.
            </p>
          </div>
        )}

        {/* Individual balances */}
        {!isEmpty && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Balances</h2>
            {loading ? (
              <SkeletonList count={3} />
            ) : (
              <div className="flex flex-col gap-2">
                {data!.balances.map((item) => (
                  <BalanceRow key={item.userId} item={item} onSettleUp={() => handleSettleUp(item)} />
                ))}
                {data!.balances.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-6 glass-panel rounded-2xl border-white/[0.04]">
                    No outstanding balances.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Activity feed */}
        {!isEmpty && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Activity</h2>
            {loading ? (
              <SkeletonList count={4} />
            ) : data!.activity.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 glass-panel rounded-2xl border-white/[0.04]">
                No recent activity.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {data!.activity.map((item) => (
                  <ActivityRow key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {settleTarget && (
        <SettleUpModal
          recipientId={settleTarget.userId}
          recipientName={settleTarget.name}
          amountOwed={settleTarget.amountOwed}
          onClose={() => setSettleTarget(null)}
          onSettled={() => {
            setSettleTarget(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, amount, color }: { label: string; amount: number | null; color: "red" | "green" }) {
  const isRed = color === "red";
  const glowBorder = isRed ? "border-rose-500/10 hover:border-rose-500/20 bg-rose-950/[0.08]" : "border-emerald-500/10 hover:border-emerald-500/20 bg-emerald-950/[0.08]";
  const textColor = isRed ? "text-rose-400 text-glow-red" : "text-emerald-400 text-glow-green";

  return (
    <div className={`rounded-2xl border px-4 py-4 relative overflow-hidden group transition-all duration-300 ${glowBorder}`}>
      {/* Dynamic accent background node */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all duration-300 group-hover:scale-110 ${
        isRed ? "bg-rose-500/[0.03] group-hover:bg-rose-500/[0.06]" : "bg-emerald-500/[0.03] group-hover:bg-emerald-500/[0.06]"
      }`} />
      
      <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">{label}</p>
      {amount === null ? (
        <Skeleton className="h-7 w-20 bg-slate-800" />
      ) : (
        <p className={`text-xl font-bold tracking-tight ${textColor}`}>{formatINR(amount)}</p>
      )}
    </div>
  );
}

function BalanceRow({ item, onSettleUp }: { item: BalanceSummaryItem; onSettleUp: () => void }) {
  const owesMe = item.balance > 0;
  const settled = Math.abs(item.balance) < 0.01;

  return (
    <div className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0">
        {/* Profile icon with status glow */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
          settled 
            ? "bg-slate-800/80 text-slate-400 border border-slate-700/40" 
            : owesMe 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
        }`}>
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{item.name}</p>
          {settled ? (
            <p className="text-xs text-slate-400">Settled up</p>
          ) : owesMe ? (
            <p className="text-xs text-emerald-400 font-medium">owes you <span className="font-semibold">{formatINR(item.balance)}</span></p>
          ) : (
            <p className="text-xs text-rose-400 font-medium">you owe <span className="font-semibold">{formatINR(Math.abs(item.balance))}</span></p>
          )}
        </div>
      </div>

      {!owesMe && !settled && (
        <button
          onClick={onSettleUp}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 transition-all shadow-md shadow-emerald-500/10 shrink-0 min-w-[76px]"
        >
          Settle up
        </button>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const isExpense = item.type === "expense";
  const directionPositive = item.direction > 0;

  return (
    <div className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-all duration-200">
      {/* Icon with glass styling */}
      <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/40 flex items-center justify-center shrink-0 text-base shadow-sm">
        {isExpense ? "🧾" : "💸"}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{item.description}</p>
        <p className="text-[10px] text-slate-400 font-medium">{date}</p>
      </div>

      {/* Amount details */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${directionPositive ? "text-emerald-400 text-glow-green" : "text-rose-400 text-glow-red"}`}>
          {directionPositive ? "+" : "-"}
          {formatINR(Math.abs(item.direction))}
        </p>
        <p className="text-[10px] text-slate-400">{formatINR(item.amount)} total</p>
      </div>
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-2xl bg-slate-800/40" />
      ))}
    </div>
  );
}
