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
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h1 className="text-xl font-bold text-[#1A1A2E]">Groups</h1>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={fetchGroups} loading={loading} lastUpdated={lastUpdated} />
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-lg bg-[#5BC5A7] text-white text-sm font-medium hover:bg-[#4ab396] active:bg-[#3d9f84] transition-colors"
          >
            + Create group
          </button>
        </div>
      </div>

      {/* Scrollable groups list */}
      <div className="flex-1 overflow-y-auto pb-4 min-h-0">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 px-6 py-12 text-center">
            <p className="text-gray-400 text-sm mb-3">No groups yet.</p>
            <button onClick={() => setShowModal(true)} className="text-sm font-medium text-[#5BC5A7] hover:underline">
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
