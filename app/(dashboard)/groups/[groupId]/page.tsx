"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ExpenseCard from "@/components/expenses/ExpenseCard";
import ExpenseForm, { type ExpenseFormValues } from "@/components/expenses/ExpenseForm";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import { formatINR } from "@/lib/currency";

interface Member {
  id: string;
  name: string;
  email: string;
}

interface GroupDetail {
  id: string;
  name: string;
  createdBy: { id: string; name: string; email: string };
  members: Member[];
}

interface ExpenseSplit {
  user: string;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: { id: string; name: string };
  splits: ExpenseSplit[];
  createdAt: string;
}

interface DebtEntry {
  from: string;
  to: string;
  amount: number;
}

type Tab = "expenses" | "balances" | "members";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("expenses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addMemberSubmitting, setAddMemberSubmitting] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const json = await res.json();
      if (json.success) {
        setGroup(json.data);
      } else {
        setError(json.error ?? "Group not found");
      }
    } catch {
      setError("Failed to load group");
    }
  }, [groupId]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses?groupId=${groupId}`);
      const json = await res.json();
      if (json.success) setExpenses(json.data);
    } catch {
      // show empty state
    }
  }, [groupId]);

  const fetchDebts = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/balances`);
      const json = await res.json();
      if (json.success) setDebts(json.data);
    } catch {
      // show empty state
    }
  }, [groupId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchGroup(), fetchExpenses(), fetchDebts()]);
      setLoading(false);
    }
    load();
  }, [fetchGroup, fetchExpenses, fetchDebts]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddMemberError("");
    setAddMemberSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addMemberEmail }),
      });
      const json = await res.json();
      if (json.success) {
        setAddMemberEmail("");
        await fetchGroup();
      } else {
        const msg = json.error ?? "Failed to add member";
        setAddMemberError(msg);
        showToast(msg, "error");
      }
    } catch {
      const msg = "Something went wrong";
      setAddMemberError(msg);
      showToast(msg, "error");
    } finally {
      setAddMemberSubmitting(false);
    }
  }

  async function handleLeaveGroup() {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/groups");
      } else {
        showToast(json.error ?? "Failed to leave group", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the group?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchGroup();
      } else {
        showToast(json.error ?? "Failed to remove member", "error");
      }
    } catch {
      showToast("Something went wrong", "error");
    }
  }

  async function handleAddExpense(values: ExpenseFormValues) {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Failed to add expense");
    setShowExpenseForm(false);
    await Promise.all([fetchExpenses(), fetchDebts()]);
  }

  function getMemberName(userId: string): string {
    return group?.members.find((m) => m.id === userId)?.name ?? "Unknown";
  }

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="flex items-center gap-3 mb-5">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg mb-5" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
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

  if (!group) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "balances", label: "Balances" },
    { key: "members", label: "Members" },
  ];

  return (
    <div className="px-4 py-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#5BC5A7]/20 flex items-center justify-center text-[#5BC5A7] font-semibold shrink-0">
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1A1A2E]">{group.name}</h1>
          <p className="text-xs text-gray-400">{group.members.length} members</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key ? "bg-white text-[#1A1A2E] shadow-sm" : "text-gray-500 hover:text-[#1A1A2E]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Expenses tab */}
      {activeTab === "expenses" && (
        <div className="flex flex-col gap-2">
          {showExpenseForm ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">Add expense</h3>
              <ExpenseForm
                members={group.members.map((m) => ({ id: m.id, name: m.name }))}
                groupId={groupId}
                currentUserId={currentUserId}
                onSubmit={handleAddExpense}
                onCancel={() => setShowExpenseForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowExpenseForm(true)}
              className="self-end px-4 py-2.5 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors"
            >
              + Add expense
            </button>
          )}
          {expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">No expenses yet.</p>
            </div>
          ) : (
            expenses.map((expense) => {
              const userSplit = expense.splits.find((s) => s.user === currentUserId);
              return (
                <ExpenseCard
                  key={expense.id}
                  id={expense.id}
                  description={expense.description}
                  amount={expense.amount}
                  paidByName={expense.paidBy.name}
                  userShare={userSplit?.amount ?? 0}
                  createdAt={expense.createdAt}
                />
              );
            })
          )}
        </div>
      )}

      {/* Balances tab */}
      {activeTab === "balances" && (
        <div className="flex flex-col gap-2">
          {debts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-gray-400 text-sm">Everyone is settled up.</p>
            </div>
          ) : (
            debts.map((debt, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between"
              >
                <p className="text-sm text-[#1A1A2E]">
                  <span className="font-medium">{getMemberName(debt.from)}</span>
                  <span className="text-gray-400"> owes </span>
                  <span className="font-medium">{getMemberName(debt.to)}</span>
                </p>
                <span className="text-sm font-medium text-[#FF6B6B]">{formatINR(debt.amount)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#5BC5A7]/20 flex items-center justify-center text-[#5BC5A7] font-semibold text-sm shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A2E] truncate">
                      {member.name}
                      {member.id === currentUserId && (
                        <span className="ml-1.5 text-xs text-gray-400 font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                </div>
                {/* Remove button: creator can remove others; any member can leave */}
                {member.id === currentUserId ? (
                  <button
                    onClick={handleLeaveGroup}
                    className="text-xs text-gray-400 hover:text-[#FF6B6B] transition-colors shrink-0"
                  >
                    Leave
                  </button>
                ) : group.createdBy.id === currentUserId ? (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-xs text-gray-400 hover:text-[#FF6B6B] transition-colors shrink-0"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Add member form */}
          <form onSubmit={handleAddMember} className="bg-white rounded-xl border border-gray-100 p-4">
            <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Add a member</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={addMemberEmail}
                onChange={(e) => setAddMemberEmail(e.target.value)}
                placeholder="member@example.com"
                required
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40"
              />
              <button
                type="submit"
                disabled={addMemberSubmitting}
                className="px-4 py-2.5 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors disabled:opacity-60 shrink-0"
              >
                {addMemberSubmitting ? "Adding…" : "Add"}
              </button>
            </div>
            {addMemberError && <p className="mt-2 text-xs text-[#FF6B6B]">{addMemberError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
