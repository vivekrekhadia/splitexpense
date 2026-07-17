"use client";

import { useState } from "react";
import { formatINR } from "@/lib/currency";

interface SettleUpModalProps {
  /** The user being paid */
  recipientId: string;
  recipientName: string;
  /** Pre-filled amount (the amount the current user owes) */
  amountOwed: number;
  /** Optional group context */
  groupId?: string;
  onClose: () => void;
  onSettled: () => void;
}

export default function SettleUpModal({
  recipientId,
  recipientName,
  amountOwed,
  groupId,
  onClose,
  onSettled,
}: SettleUpModalProps) {
  const [amount, setAmount] = useState(amountOwed > 0 ? amountOwed.toFixed(2) : "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Track whether we're in overpayment confirmation mode
  const [pendingOverpayment, setPendingOverpayment] = useState(false);

  async function submit(force = false) {
    setError("");
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidTo: recipientId,
          amount: parsed,
          group: groupId ?? null,
          force,
        }),
      });

      const json = await res.json();

      if (res.status === 422 && json.overpayment) {
        // Show overpayment confirmation (Requirement 7.3)
        setPendingOverpayment(true);
        setSubmitting(false);
        return;
      }

      if (!json.success) {
        setError(json.error ?? "Failed to record settlement");
        setSubmitting(false);
        return;
      }

      onSettled();
    } catch {
      setError("Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel border-white/[0.08] w-full max-w-[380px] p-6 rounded-3xl shadow-2xl relative">
        <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Settle up</h2>
        <p className="text-xs text-slate-400 mb-5 leading-normal">
          Recording a payment to <span className="font-semibold text-slate-200">{recipientName}</span>
        </p>

        {pendingOverpayment ? (
          /* Overpayment confirmation screen */
          <div className="flex flex-col gap-4">
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-300 leading-relaxed">
              The amount <span className="font-bold">{formatINR(parseFloat(amount))}</span> exceeds the outstanding
              balance of <span className="font-bold">{formatINR(amountOwed)}</span>. Are you sure you want to record
              an overpayment?
            </div>
            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
            <div className="flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setPendingOverpayment(false)}
                className="px-3.5 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/5 active:scale-95 transition-all duration-200"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={submitting}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold active:scale-95 transition-all duration-200 disabled:opacity-60"
              >
                {submitting ? "Recording…" : "Record anyway"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal form */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex flex-col gap-4.5"
          >
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl pl-8 pr-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              {amountOwed > 0 && (
                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Outstanding balance: <span className="text-rose-400 font-bold">{formatINR(amountOwed)}</span>
                </p>
              )}
            </div>

            {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:border-emerald-500/30 text-xs font-bold text-slate-200 hover:bg-white/[0.02] active:scale-95 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-60"
              >
                {submitting ? "Recording…" : "Record payment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
