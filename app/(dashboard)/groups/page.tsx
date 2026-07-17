"use client";

import { useState, useEffect, useCallback } from "react";
import GroupCard from "@/components/groups/GroupCard";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import RefreshButton from "@/components/ui/RefreshButton";

interface Group {
  id: string;
  name: string;
  members: { id: string; name: string; email: string }[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { showToast } = useToast();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      const json = await res.json();
      if (json.success) {
        setGroups(json.data);
        setLastUpdated(new Date());
      } else {
        showToast(json.error ?? "Failed to load groups", "error");
      }
    } catch {
      showToast("Something went wrong loading groups", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  function handleCreated(group: { id: string; name: string }) {
    setShowModal(false);
    // Optimistically add the group then refetch for full data
    setGroups((prev) => [{ ...group, members: [] }, ...prev]);
    fetchGroups();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 pt-5">
      {/* Fixed header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <h1 className="text-xl font-bold text-slate-100 tracking-wide">Groups</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchGroups} loading={loading} lastUpdated={lastUpdated} />
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/10 shrink-0"
          >
            + Create group
          </button>
        </div>
      </div>

      {/* Scrollable groups list */}
      <div className="flex-1 overflow-y-auto pb-6 min-h-0 pr-0.5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl bg-slate-800/40" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="glass-panel border-white/[0.04] rounded-2xl px-6 py-12 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <p className="text-slate-400 text-xs mb-4 max-w-[200px] mx-auto leading-relaxed">
              No groups yet. Create your first group below to begin tracking expenses.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-bold text-emerald-400 hover:underline hover:text-emerald-300 transition-colors"
            >
              Create your first group →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <GroupCard key={group.id} id={group.id} name={group.name} memberCount={group.members.length} />
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateGroupModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
