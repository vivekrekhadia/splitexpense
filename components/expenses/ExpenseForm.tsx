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
        return `Split amounts must sum to ₹${total.toFixed(2)} (currently ₹${splitTotal.toFixed(2)})`;
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
        <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Dinner, Groceries"
          required
          className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          required
          className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
        />
      </div>

      {/* Paid by */}
      <div>
        <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Paid by</label>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          required
          className="w-full text-sm bg-[#0e1424] border border-white/5 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id} className="bg-slate-950 text-slate-100">
              {m.name}
              {m.id === currentUserId ? " (you)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Participants */}
      <div>
        <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">Split between</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const isSelected = participants.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleParticipant(m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 duration-200 ${
                  isSelected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                    : "bg-slate-900/40 text-slate-400 border-white/5 hover:border-emerald-500/20"
                }`}
              >
                {m.name}
                {m.id === currentUserId ? " (you)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split type toggle */}
      <div>
        <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2">Split type</label>
        <div className="flex gap-1 bg-slate-900 border border-white/5 rounded-xl p-1 w-fit">
          {splitTypes.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSplitType(key)}
              className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                splitType === key
                  ? "bg-white/[0.08] text-slate-100 shadow-md shadow-black/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic split inputs (exact / percentage) */}
      {splitType !== "equal" && participants.length > 0 && (
        <div className="flex flex-col gap-2.5 bg-slate-950/30 rounded-xl p-3 border border-white/[0.03]">
          <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
            {splitType === "percentage" ? "Percentages" : "Amounts"}
          </label>
          {participants.map((id) => {
            const member = members.find((m) => m.id === id);
            return (
              <div key={id} className="flex items-center justify-between gap-3 py-1 border-b border-white/[0.03] last:border-b-0">
                <span className="text-xs text-slate-300 font-medium truncate">
                  {member?.name ?? id}
                  {id === currentUserId ? " (you)" : ""}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    value={exactSplits[id] ?? ""}
                    onChange={(e) => setExactSplits((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder={splitType === "percentage" ? "0" : "0.00"}
                    min="0"
                    step={splitType === "percentage" ? "1" : "0.01"}
                    inputMode="decimal"
                    required
                    className="w-24 text-xs bg-slate-900 border border-white/5 rounded-xl px-2 py-1.5 text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                  <span className="text-xs text-slate-400 font-bold w-4 text-center">{splitType === "percentage" ? "%" : "₹"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-rose-400 font-medium mt-1">{error}</p>}

      <div className="flex gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-slate-200 hover:bg-white/[0.02] active:scale-95 transition-all duration-200"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
