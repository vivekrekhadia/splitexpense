"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ExpenseForm, { type ExpenseFormValues, type Member } from "@/components/expenses/ExpenseForm";
import { formatINR } from "@/lib/currency";
import { useToast } from "@/lib/toast";

interface Split {
  user: string;
  name: string;
  amount: number;
}

interface ExpenseDetail {
  id: string;
  description: string;
  amount: number;
  paidBy: { id: string; name: string };
  createdBy: { id: string; name: string };
  splits: Split[];
  splitType: "equal" | "exact" | "percentage";
  group: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ExpenseDetailPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const { showToast } = useToast();

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchExpense = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`);
      const json = await res.json();
      if (json.success) {
        setExpense(json.data);
      } else {
        setError(json.error ?? "Expense not found");
      }
    } catch {
      setError("Failed to load expense");
    }
  }, [expenseId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchExpense();
      setLoading(false);
    }
    load();
  }, [fetchExpense]);

  async function handleEdit(values: ExpenseFormValues) {
    const res = await fetch(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to update expense");
    setExpense(json.data);
    setEditing(false);
    showToast("Expense updated successfully", "success");
  }

  async function handleDelete() {
    if (!confirm("Delete this expense? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Expense deleted successfully", "success");
        if (expense?.group) {
          router.push(`/groups/${expense.group}`);
        } else {
          router.push("/friends");
        }
      } else {
        showToast(json.error ?? "Failed to delete expense", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
        <div className="h-6 w-32 bg-slate-800 animate-pulse mb-5 rounded-lg shrink-0" />
        <div className="flex-1 overflow-y-auto pb-4 min-h-0">
          <div className="glass-panel border-white/[0.04] rounded-2xl p-6 flex flex-col gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 bg-slate-800 animate-pulse rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
        <p className="text-rose-400 text-sm bg-rose-950/20 border border-rose-500/10 rounded-xl px-4 py-3">{error}</p>
      </div>
    );
  }

  if (!expense) return null;

  const formattedDate = new Date(expense.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const members: Member[] = expense.splits.map((s) => ({ id: s.user, name: s.name }));
  if (!members.find((m) => m.id === expense.paidBy.id)) {
    members.unshift({ id: expense.paidBy.id, name: expense.paidBy.name });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
      {/* Back button */}
      <button
        onClick={() => (expense.group ? router.push(`/groups/${expense.group}`) : router.back())}
        className="text-xs font-bold text-slate-400 hover:text-slate-200 mb-5 flex items-center gap-1 transition-colors py-1.5 px-3 border border-white/5 rounded-xl bg-white/[0.02] w-fit shrink-0 active:scale-95 transition-all"
      >
        ← Back
      </button>

      <div className="flex-1 overflow-y-auto pb-6 min-h-0 pr-0.5">
        {editing ? (
          <div className="glass-panel border-white/[0.04] rounded-2xl p-6">
            <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider mb-4">Edit expense</h2>
            <ExpenseForm
              members={members}
              groupId={expense.group ?? undefined}
              currentUserId={currentUserId}
              initialValues={{
                description: expense.description,
                amount: expense.amount,
                paidBy: expense.paidBy.id,
                splits: expense.splits.map((s) => ({ user: s.user, amount: s.amount })),
                splitType: expense.splitType,
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditing(false)}
              submitLabel="Save changes"
            />
          </div>
        ) : (
          <div className="glass-panel border-white/[0.04] rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden">
            {/* Ambient glows inside card */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/[0.03] rounded-full blur-2xl pointer-events-none" />
            
            {/* Header info */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-100 tracking-wide leading-snug">{expense.description}</h1>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{formattedDate}</p>
              </div>
              <span className="text-xl font-bold text-emerald-400 text-glow-green shrink-0">{formatINR(expense.amount)}</span>
            </div>

            {/* Payer and Creator details */}
            <div className="grid grid-cols-3 gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Paid by</p>
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {expense.paidBy.name}
                  {expense.paidBy.id === currentUserId ? " (you)" : ""}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">Added by</p>
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {expense.createdBy?.name ?? "Unknown"}
                  {expense.createdBy?.id === currentUserId ? " (you)" : ""}
                </p>
              </div>
              
              {/* Split type badge details */}
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">Split type</p>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold capitalize tracking-wide">
                  {expense.splitType}
                </span>
              </div>
            </div>

            {/* Split breakdown details */}
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2.5 font-semibold">Breakdown</p>
              <div className="flex flex-col gap-2 bg-slate-950/30 rounded-xl p-3 border border-white/[0.03]">
                {expense.splits.map((s) => (
                  <div key={s.user} className="flex items-center justify-between py-1 border-b border-white/[0.03] last:border-b-0">
                    <span className="text-xs text-slate-300 font-medium">
                      {s.name}
                      {s.user === currentUserId ? " (you)" : ""}
                    </span>
                    <span className="text-xs font-bold text-slate-100">{formatINR(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-slate-200 hover:bg-white/[0.02] active:scale-95 transition-all duration-200"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 active:scale-95 transition-all duration-200 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
