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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6 pb-8 sm:pb-6">
        <h2 className="text-lg font-semibold text-[#1A1A2E] mb-1">Settle up</h2>
        <p className="text-sm text-gray-500 mb-5">
          Recording a payment to <span className="font-medium text-[#1A1A2E]">{recipientName}</span>
        </p>

        {pendingOverpayment ? (
          /* Overpayment confirmation screen */
          <div className="flex flex-col gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              The amount <span className="font-semibold">{formatINR(parseFloat(amount))}</span> exceeds the outstanding
              balance of <span className="font-semibold">{formatINR(amountOwed)}</span>. Are you sure you want to record
              an overpayment?
            </div>
            {error && <p className="text-xs text-[#FF6B6B]">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingOverpayment(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60"
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
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40"
                />
              </div>
              {amountOwed > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Outstanding balance: <span className="text-[#FF6B6B] font-medium">{formatINR(amountOwed)}</span>
                </p>
              )}
            </div>

            {error && <p className="text-xs text-[#FF6B6B]">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] transition-colors disabled:opacity-60"
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
