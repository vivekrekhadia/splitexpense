"use client";

import { useState, useEffect, useCallback } from "react";
import FriendCard from "@/components/friends/FriendCard";
import SettleUpModal from "@/components/settlements/SettleUpModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import RefreshButton from "@/components/ui/RefreshButton";

interface Friend {
  id: string;
  name: string;
  email: string;
  balance: number;
}

interface PendingRequest {
  requestId: string;
  from: { id: string; name: string; email: string };
}

interface SettleTarget {
  friendId: string;
  friendName: string;
  amountOwed: number;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [settleTarget, setSettleTarget] = useState<SettleTarget | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { showToast } = useToast();

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      const json = await res.json();
      if (json.success) {
        setFriends(json.data.friends);
        setPendingRequests(json.data.pendingRequests || []);
        setLastUpdated(new Date());
      } else {
        showToast(json.error ?? "Failed to load friends", "error");
      }
    } catch {
      showToast("Something went wrong loading friends", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Friend request sent to ${email}`);
        setEmail("");
        showToast(`Request sent to ${email}`, "success");
      } else {
        setError(json.error ?? "Failed to send request");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRespond(requestId: string, status: "accepted" | "rejected") {
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(status === "accepted" ? "Friend request accepted" : "Friend request declined", "success");
        await fetchFriends();
      }
    } catch {
      showToast("Failed to respond to request", "error");
    }
  }

  function handleSettleUp(friendId: string) {
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;
    // balance: positive = friend owes you, negative = you owe friend
    const amountOwed = friend.balance < 0 ? Math.abs(friend.balance) : 0;
    setSettleTarget({ friendId, friendName: friend.name, amountOwed });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">Friends</h1>
        <RefreshButton onRefresh={fetchFriends} loading={loading} lastUpdated={lastUpdated} />
      </div>

      {/* Add friend form */}
      <form onSubmit={handleSendRequest} className="glass-panel border-white/[0.04] rounded-2xl p-4 mb-5 shrink-0">
        <label className="block text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
          Add a friend by email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          className="w-full text-sm bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all mb-2.5"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-[0.98] text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-60 shrink-0"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-400 font-medium">{error}</p>}
        {success && <p className="mt-2 text-xs text-emerald-400 font-medium">{success}</p>}
      </form>

      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto pb-6 min-h-0 pr-0.5 flex flex-col gap-6">
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pending requests</h2>
            <div className="flex flex-col gap-2">
              {pendingRequests.map((req) => (
                <div key={req.requestId} className="glass-panel border-white/[0.04] rounded-2xl px-4 py-3.5">
                  <div className="flex items-center gap-3 mb-3.5">
                    <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/40 flex items-center justify-center text-slate-200 font-bold text-sm shrink-0">
                      {req.from.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate tracking-wide">{req.from.name}</p>
                      <p className="text-xs text-slate-400 truncate">{req.from.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(req.requestId, "accepted")}
                      className="flex-1 text-xs font-bold py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(req.requestId, "rejected")}
                      className="flex-1 text-xs font-bold py-2 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Friends list */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Friends</h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-2xl bg-slate-800/40" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="glass-panel border-white/[0.04] rounded-2xl px-6 py-12 text-center">
              <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto">
                No friends yet. Add one by entering their email above to get started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  id={friend.id}
                  name={friend.name}
                  email={friend.email}
                  balance={friend.balance}
                  onSettleUp={handleSettleUp}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {settleTarget && (
        <SettleUpModal
          recipientId={settleTarget.friendId}
          recipientName={settleTarget.friendName}
          amountOwed={settleTarget.amountOwed}
          onClose={() => setSettleTarget(null)}
          onSettled={() => {
            setSettleTarget(null);
            fetchFriends();
          }}
        />
      )}
    </div>
  );
}
