"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ExpenseForm, { type ExpenseFormValues, type Member } from "@/components/expenses/ExpenseForm";
import { formatINR } from "@/lib/currency";

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
  }

  async function handleDelete() {
    if (!confirm("Delete this expense? This action cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        if (expense?.group) {
          router.push(`/groups/${expense.group}`);
        } else {
          router.push("/friends");
        }
      } else {
        alert(json.error ?? "Failed to delete expense");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-5" />
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-5">
        <p className="text-[#FF6B6B] text-sm">{error}</p>
      </div>
    );
  }

  if (!expense) return null;

  const isCreator = expense.createdBy.id === currentUserId;
  const formattedDate = new Date(expense.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Members derived from splits for the edit form
  const members: Member[] = expense.splits.map((s) => ({ id: s.user, name: s.name }));
  // Ensure paidBy is in members list if not already
  if (!members.find((m) => m.id === expense.paidBy.id)) {
    members.unshift({ id: expense.paidBy.id, name: expense.paidBy.name });
  }

  return (
    <div className="px-4 py-5">
      {/* Back link */}
      <button
        onClick={() => (expense.group ? router.push(`/groups/${expense.group}`) : router.back())}
        className="text-sm text-gray-400 hover:text-[#1A1A2E] mb-5 flex items-center gap-1 transition-colors py-1"
      >
        ← Back
      </button>

      {editing ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Edit expense</h2>
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
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A2E]">{expense.description}</h1>
              <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
            </div>
            <span className="text-2xl font-bold text-[#1A1A2E]">{formatINR(expense.amount)}</span>
          </div>

          {/* Paid by */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Paid by</p>
            <p className="text-sm font-medium text-[#1A1A2E]">
              {expense.paidBy.name}
              {expense.paidBy.id === currentUserId ? " (you)" : ""}
            </p>
          </div>

          {/* Split type */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Split type</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#5BC5A7]/10 text-[#5BC5A7] text-xs font-medium capitalize">
              {expense.splitType}
            </span>
          </div>

          {/* Splits breakdown */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Breakdown</p>
            <div className="flex flex-col gap-2">
              {expense.splits.map((s) => (
                <div key={s.user} className="flex items-center justify-between">
                  <span className="text-sm text-[#1A1A2E]">
                    {s.name}
                    {s.user === currentUserId ? " (you)" : ""}
                  </span>
                  <span className="text-sm font-medium text-[#1A1A2E]">{formatINR(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Creator actions */}
          {isCreator && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setEditing(true)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-[#1A1A2E] hover:border-[#5BC5A7] active:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-[#FF6B6B]/10 text-[#FF6B6B] text-sm font-medium hover:bg-[#FF6B6B]/20 active:bg-[#FF6B6B]/30 transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
