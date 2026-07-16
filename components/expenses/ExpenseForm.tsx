"use client";

import { useState, useEffect } from "react";

export interface Member {
  id: string;
  name: string;
}

export interface SplitEntry {
  user: string;
  amount: number;
}

export interface ExpenseFormValues {
  description: string;
  amount: number;
  paidBy: string;
  splits: SplitEntry[];
  splitType: "equal" | "exact" | "percentage";
  group?: string | null;
}

interface ExpenseFormProps {
  members: Member[];
  groupId?: string;
  currentUserId: string;
  initialValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function ExpenseForm({
  members,
  groupId,
  currentUserId,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Add expense",
}: ExpenseFormProps) {
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [amount, setAmount] = useState(initialValues?.amount?.toString() ?? "");
  const [paidBy, setPaidBy] = useState(initialValues?.paidBy ?? currentUserId);
  const [splitType, setSplitType] = useState<"equal" | "exact" | "percentage">(initialValues?.splitType ?? "equal");
  const [participants, setParticipants] = useState<string[]>(
    initialValues?.splits?.map((s) => s.user) ?? members.map((m) => m.id),
  );
  const [exactSplits, setExactSplits] = useState<Record<string, string>>(() => {
    if (initialValues?.splits) {
      return Object.fromEntries(initialValues.splits.map((s) => [s.user, s.amount.toString()]));
    }
    return {};
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Recalculate equal splits when participants or amount changes
  useEffect(() => {
    if (splitType === "equal" && participants.length > 0) {
      const parsed = parseFloat(amount);
      if (!isNaN(parsed) && parsed > 0) {
        const share = Math.round((parsed / participants.length) * 100) / 100;
        const newSplits: Record<string, string> = {};
        participants.forEach((id, idx) => {
          // Give the last participant any rounding remainder
          if (idx === participants.length - 1) {
            const allocated = share * (participants.length - 1);
            newSplits[id] = (Math.round((parsed - allocated) * 100) / 100).toString();
          } else {
            newSplits[id] = share.toString();
          }
        });
        setExactSplits(newSplits);
      }
    }
  }, [amount, participants, splitType]);

  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function buildSplits(): SplitEntry[] {
    const parsed = parseFloat(amount);
    if (splitType === "equal") {
      return participants.map((id) => ({ user: id, amount: parseFloat(exactSplits[id] ?? "0") }));
    }
    if (splitType === "percentage") {
      return participants.map((id) => {
        const pct = parseFloat(exactSplits[id] ?? "0") / 100;
        return { user: id, amount: Math.round(pct * parsed * 100) / 100 };
      });
    }
    // exact
    return participants.map((id) => ({ user: id, amount: parseFloat(exactSplits[id] ?? "0") }));
  }

  function validateSplits(splits: SplitEntry[], total: number): string | null {
    if (splits.length === 0) return "Select at least one participant";
    if (splitType === "percentage") {
      const pctSum = participants.reduce((s, id) => s + parseFloat(exactSplits[id] ?? "0"), 0);
      if (Math.abs(pctSum - 100) > 0.1) return `Percentages must sum to 100% (currently ${pctSum.toFixed(1)}%)`;
    } else {
      const splitTotal = splits.reduce((s, e) => s + e.amount, 0);
      if (Math.abs(splitTotal - total) > 0.01)
        return `Split amounts must sum to $${total.toFixed(2)} (currently $${splitTotal.toFixed(2)})`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid positive amount");
      return;
    }

    if (!paidBy) {
      setError("Select who paid");
      return;
    }

    const splits = buildSplits();
    const validationError = validateSplits(splits, parsedAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        description,
        amount: parsedAmount,
        paidBy,
        splits,
        splitType,
        group: groupId ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const splitTypes: { key: "equal" | "exact" | "percentage"; label: string }[] = [
    { key: "equal", label: "Equal" },
    { key: "exact", label: "Exact" },
    { key: "percentage", label: "%" },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A2E] mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Groceries"
          required
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A2E] mb-1">Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40"
        />
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A2E] mb-1">Paid by</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          required
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40 bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.id === currentUserId ? " (you)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Participants */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Split between</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleParticipant(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                participants.includes(m.id)
                  ? "bg-[#5BC5A7] text-white border-[#5BC5A7]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-[#5BC5A7]/40"
              }`}
            >
              {m.name}
              {m.id === currentUserId ? " (you)" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Split type toggle */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Split type</label>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {splitTypes.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSplitType(key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                splitType === key ? "bg-white text-[#1A1A2E] shadow-sm" : "text-gray-500 hover:text-[#1A1A2E]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic split inputs (exact / percentage) */}
      {splitType !== "equal" && participants.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#1A1A2E]">
            {splitType === "percentage" ? "Percentages" : "Amounts"}
          </label>
          {participants.map((id) => {
            const member = members.find((m) => m.id === id);
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="text-sm text-[#1A1A2E] flex-1 min-w-0 truncate">
                  {member?.name ?? id}
                  {id === currentUserId ? " (you)" : ""}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={exactSplits[id] ?? ""}
                    onChange={(e) => setExactSplits((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder={splitType === "percentage" ? "0" : "0.00"}
                    min="0"
                    step={splitType === "percentage" ? "1" : "0.01"}
                    inputMode="decimal"
                    required
                    className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40"
                  />
                  <span className="text-xs text-gray-400 w-4">{splitType === "percentage" ? "%" : "₹"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-[#FF6B6B]">{error}</p>}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-gray-300 active:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
