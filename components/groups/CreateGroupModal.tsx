"use client";

import { useState } from "react";

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (group: { id: string; name: string }) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addEmail() {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }
    if (emails.includes(trimmed)) {
      setError("Email already added");
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
    setError("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), memberEmails: emails }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated(json.data);
      } else {
        setError(json.error ?? "Failed to create group");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel border-white/[0.08] w-full max-w-[380px] p-6 rounded-3xl shadow-2xl relative">
        <div className="w-10 h-1 bg-slate-800 rounded-full mx-auto mb-4 md:hidden" />
        <h2 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-5">Create a group</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Roommates"
              required
              className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5">Add members by email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="member@example.com"
                className="flex-1 text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="button"
                onClick={addEmail}
                className="px-3.5 py-2 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 active:scale-95 transition-all shrink-0"
              >
                Add
              </button>
            </div>
            
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5 max-h-24 overflow-y-auto pr-1">
                {emails.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-1 rounded-full"
                  >
                    <span className="truncate max-w-[120px]">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-emerald-400 hover:text-rose-400 font-bold leading-none"
                      aria-label={`Remove ${email}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

          <div className="flex gap-2.5 pt-2">
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
              {submitting ? "Creating…" : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
