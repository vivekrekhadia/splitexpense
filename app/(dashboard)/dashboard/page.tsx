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
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#1A1A2E]">Dashboard</h1>
        <RefreshButton onRefresh={fetchDashboard} loading={loading} lastUpdated={lastUpdated} />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 text-sm text-[#FF6B6B]">
          {error}
          <button onClick={fetchDashboard} className="ml-3 underline font-medium hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SummaryCard label="You owe" amount={loading ? null : (data?.totalOwed ?? 0)} color="red" />
        <SummaryCard label="You are owed" amount={loading ? null : (data?.totalOwedToMe ?? 0)} color="green" />
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-white rounded-xl border border-gray-100 px-6 py-12 text-center mb-6">
          <p className="text-2xl mb-3">🎉</p>
          <p className="text-gray-600 font-medium mb-1">You&apos;re all settled up!</p>
          <p className="text-sm text-gray-400">Add friends and create groups to start splitting expenses.</p>
        </div>
      )}

      {/* Individual balances */}
      {!isEmpty && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Balances</h2>

          {loading ? (
            <SkeletonList count={3} />
          ) : (
            <div className="flex flex-col gap-2">
              {data!.balances.map((item) => (
                <BalanceRow key={item.userId} item={item} onSettleUp={() => handleSettleUp(item)} />
              ))}
              {data!.balances.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No outstanding balances.</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Activity feed */}
      {!isEmpty && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h2>

          {loading ? (
            <SkeletonList count={4} />
          ) : data!.activity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No recent activity.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data!.activity.map((item) => (
                <ActivityRow key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>
      )}

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
  const textColor = color === "red" ? "text-[#FF6B6B]" : "text-[#5BC5A7]";
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {amount === null ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className={`text-2xl font-bold ${textColor}`}>{formatINR(amount)}</p>
      )}
    </div>
  );
}

function BalanceRow({ item, onSettleUp }: { item: BalanceSummaryItem; onSettleUp: () => void }) {
  const owesMe = item.balance > 0;
  const settled = Math.abs(item.balance) < 0.01;

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
          {item.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">{item.name}</p>
          {settled ? (
            <p className="text-xs text-gray-400">Settled up</p>
          ) : owesMe ? (
            <p className="text-xs text-[#5BC5A7]">owes you {formatINR(item.balance)}</p>
          ) : (
            <p className="text-xs text-[#FF6B6B]">you owe {formatINR(Math.abs(item.balance))}</p>
          )}
        </div>
      </div>

      {!owesMe && !settled && (
        <button
          onClick={onSettleUp}
          className="text-xs font-medium px-3 py-2.5 rounded-lg bg-[#5BC5A7] text-white hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors shrink-0 min-w-[80px]"
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
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      {/* Icon */}
      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-base">
        {isExpense ? "🧾" : "💸"}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A2E] truncate">{item.description}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${directionPositive ? "text-[#5BC5A7]" : "text-[#FF6B6B]"}`}>
          {directionPositive ? "+" : "-"}
          {formatINR(Math.abs(item.direction))}
        </p>
        <p className="text-xs text-gray-400">{formatINR(item.amount)} total</p>
      </div>
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
