"use client";

import { useState, useEffect, useCallback } from "react";
import FriendCard from "@/components/friends/FriendCard";
import SettleUpModal from "@/components/settlements/SettleUpModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";

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
  const { showToast } = useToast();

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/friends");
      const json = await res.json();
      if (json.success) {
        setFriends(json.data.friends);
        setPendingRequests(json.data.pendingRequests);
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
        await fetchFriends();
      }
    } catch {
      // ignore
    }
  }

  function handleSettleUp(friendId: string) {
    const friend = friends.find((f) => f.id === friendId);
    if (!friend) return;
    // balance: positive = friend owes you, negative = you owe friend
    // amountOwed to the modal is how much the current user owes the friend
    const amountOwed = friend.balance < 0 ? Math.abs(friend.balance) : 0;
    setSettleTarget({ friendId, friendName: friend.name, amountOwed });
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-[#1A1A2E] mb-4">Friends</h1>

      {/* Add friend form */}
      <form onSubmit={handleSendRequest} className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <label className="block text-sm font-medium text-[#1A1A2E] mb-2">Add a friend by email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#5BC5A7]/40 mb-2"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
        {error && <p className="mt-2 text-xs text-[#FF6B6B]">{error}</p>}
        {success && <p className="mt-2 text-xs text-[#5BC5A7]">{success}</p>}
      </form>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Pending requests</h2>
          <div className="flex flex-col gap-2">
            {pendingRequests.map((req) => (
              <div key={req.requestId} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
                    {req.from.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A2E] truncate">{req.from.name}</p>
                    <p className="text-xs text-gray-400 truncate">{req.from.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(req.requestId, "accepted")}
                    className="flex-1 text-sm font-medium py-2.5 rounded-lg bg-[#5BC5A7] text-white hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.requestId, "rejected")}
                    className="flex-1 text-sm font-medium py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
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
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Friends</h2>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">No friends yet. Add one above to get started.</p>
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
