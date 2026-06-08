"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";

export default function AdminOnlineGamesPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function PlayerList({ players }: { players: any[] }) {
    const [avatars, setAvatars] = useState<Record<string, string>>({});

    useEffect(() => {
      if (!players || players.length === 0) return;
      const userIds = players.map(p => p.userId);
      fetch("/api/roblox/avatars", {
        method: "POST",
        body: JSON.stringify({ userIds })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const map: Record<string, string> = {};
          data.data.forEach((item: any) => {
            map[item.targetId] = item.imageUrl;
          });
          setAvatars(map);
        }
      })
      .catch(console.error);
    }, [players]);

    if (!players || players.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-purple-500/10">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Players Online ({players.length})</h3>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <div key={p.userId} className="flex items-center gap-2 bg-dark-800/50 rounded-full pr-3 border border-purple-500/5">
              <img 
                src={avatars[p.userId] || "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39df885e827/150/150/AvatarHeadshot/Png"} 
                alt={p.name}
                className="w-8 h-8 rounded-full bg-dark-900 object-cover"
              />
              <div className="flex flex-col py-1">
                <span className="text-xs font-medium text-white leading-none">{p.displayName}</span>
                <span className="text-[10px] text-gray-500 leading-none mt-0.5">@{p.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fetchServers = useCallback(async () => {
    try {
      const res = await window.fetch("/api/servers/active");
      const data = await res.json();
      if (data.success) setSessions(data.active || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { 
    fetchServers(); 
    const id = setInterval(fetchServers, 10000); 
    return () => clearInterval(id); 
  }, [fetchServers]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const totalPlayers = sessions.reduce((sum, s) => sum + (s.playerCount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Online Games List</h1>
          <p className="text-sm text-gray-400 mt-1">{sessions.length} server{sessions.length !== 1 ? "s" : ""} · {totalPlayers} total players</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No active game servers.</p></GlassCard>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-center gap-4">
                  {s.gameThumbnail && (
                    <img src={s.gameThumbnail} alt={s.gameName || ""}
                      className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm font-semibold text-white">{s.gameName || "Unknown Game"}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Server: <code className="text-gray-400 font-mono">{s.serverId?.slice(0, 20)}...</code></span>
                      <span>Players: <span className="text-white font-medium">{s.playerCount ?? 0}/{s.maxPlayers ?? "?"}</span></span>
                      <span>Universe: <code className="text-gray-400 font-mono">{s.universeId || "—"}</code></span>
                      {s.placeId && <span>Place: <code className="text-gray-400 font-mono">{s.placeId}</code></span>}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      Last heartbeat: {s.lastHeartbeat ? new Date(s.lastHeartbeat).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
                {s.players && s.players.length > 0 && <PlayerList players={s.players} />}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
