"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";

const TYPE_COLORS: Record<string, string> = {
  verify: "text-green-400 bg-green-500/10",
  activate: "text-blue-400 bg-blue-500/10",
  revoke: "text-red-400 bg-red-500/10",
  heartbeat: "text-purple-400 bg-purple-500/10",
  blacklist_deny: "text-orange-400 bg-orange-500/10",
};

export default function AdminLicenseActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = useCallback(async () => {
    try {
      const res = await window.fetch("/api/license/activity");
      const data = await res.json();
      if (data.success) setActivities(data.entries);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); const id = setInterval(fetch, 10000); return () => clearInterval(id); }, [fetch]);

  const filtered = activities.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.licenseKey?.toLowerCase().includes(q) || a.type?.toLowerCase().includes(q) || a.licenseId?.toLowerCase().includes(q);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">License Activity Log</h1>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by key or type..."
          className="w-64 px-4 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
      </div>

      {filtered.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No activity recorded yet.</p></GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((a, i) => (
            <motion.div key={a.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <GlassCard className="py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] || "text-gray-400 bg-gray-500/10"}`}>
                    {a.type}
                  </span>
                  <code className="text-xs text-purple-300 font-mono">{a.licenseKey || "—"}</code>
                  <span className="text-xs text-gray-500">{a.details?.universeId ? `Universe: ${a.details.universeId}` : ""}</span>
                  <span className="text-xs text-gray-500">{a.details?.placeId ? `Place: ${a.details.placeId}` : ""}</span>
                  <span className="text-xs text-gray-500 ml-auto">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</span>
                </div>
                {a.details?.serverId && (
                  <div className="mt-1 text-[10px] text-gray-600 font-mono">Server: {a.details.serverId}</div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
