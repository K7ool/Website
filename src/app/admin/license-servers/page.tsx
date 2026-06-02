"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { activeSessionService } from "@/lib/firestore";

export default function AdminLicenseServersPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = activeSessionService.subscribe((items) => {
      const now = Date.now();
      const active = items.filter((s: any) => {
        if (!s.lastHeartbeat) return false;
        return now - new Date(s.lastHeartbeat).getTime() < 120000;
      });
      setSessions(active);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleEndSession = async (id: string) => {
    if (!confirm("End this server session?")) return;
    try { await activeSessionService.end(id); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalPlayers = sessions.reduce((sum, s) => sum + (s.playerCount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Server Sessions</h1>
          <p className="text-sm text-gray-400 mt-1">{sessions.length} server{sessions.length !== 1 ? "s" : ""} · {totalPlayers} total players</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No active server sessions.</p></GlassCard>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <code className="text-sm text-purple-300 font-mono">{s.licenseKey || "—"}</code>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Server: <code className="text-gray-400 font-mono">{s.serverId?.slice(0, 20)}...</code></span>
                      <span>Players: <span className="text-white font-medium">{s.playerCount ?? 0}/{s.maxPlayers ?? "?"}</span></span>
                      <span>Universe: <code className="text-gray-400 font-mono">{s.universeId || "—"}</code></span>
                      {s.placeId && <span>Place: <code className="text-gray-400 font-mono">{s.placeId}</code></span>}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      Started: {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"} · Last heartbeat: {s.lastHeartbeat ? new Date(s.lastHeartbeat).toLocaleString() : "—"}
                    </div>
                  </div>
                  <button onClick={() => handleEndSession(s.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 shrink-0 transition-all">
                    End Session
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
