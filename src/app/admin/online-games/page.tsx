"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";

/* ───────────────────────── Player Action Modal ───────────────────────── */

function PlayerModal({
  player,
  serverId,
  avatarUrl,
  onClose,
}: {
  player: { userId: number; name: string; displayName: string };
  serverId: string;
  avatarUrl: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [playerInfo, setPlayerInfo] = useState<Record<string, any> | null>(null);

  async function sendCommand(type: string, payload: Record<string, any> = {}) {
    setSending(type);
    setFeedback(null);
    try {
      const res = await fetch("/api/servers/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          type,
          targetUserId: player.userId,
          targetName: player.name,
          payload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "ok", text: `${type.toUpperCase()} command sent!` });

        // For info, poll for result
        if (type === "info" && data.commandId) {
          pollForResult(data.commandId);
          return; // don't clear sending yet
        }

        if (type === "kick" || type === "ban") {
          setTimeout(onClose, 1200);
        }
      } else {
        setFeedback({ type: "err", text: data.reason || "Failed" });
      }
    } catch {
      setFeedback({ type: "err", text: "Network error" });
    }
    setSending(null);
  }

  async function pollForResult(commandId: string) {
    // Poll every 1s up to 10 times
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await fetch(`/api/servers/commands/result?commandId=${commandId}`);
        const data = await res.json();
        if (data.success && data.status === "completed" && data.result) {
          setPlayerInfo(data.result);
          setFeedback({ type: "ok", text: "Player info received!" });
          setSending(null);
          return;
        }
      } catch { /* keep polling */ }
    }
    setFeedback({ type: "err", text: "Timed out waiting for info" });
    setSending(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="bg-dark-800 border border-purple-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <img
            src={avatarUrl || "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39df885e827/150/150/AvatarHeadshot/Png"}
            alt={player.name}
            className="w-16 h-16 rounded-full border-2 border-purple-500/30 bg-dark-900 object-cover"
          />
          <div>
            <h2 className="text-lg font-bold text-white">{player.displayName}</h2>
            <p className="text-sm text-gray-400">@{player.name}</p>
            <p className="text-xs text-gray-500 font-mono">ID: {player.userId}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition text-xl">✕</button>
        </div>

        {/* Player Info Display */}
        {playerInfo && (
          <div className="mb-4 p-3 rounded-lg bg-dark-900/60 border border-purple-500/10 text-xs space-y-1">
            {Object.entries(playerInfo).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                <span className="text-white font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-2.5 rounded-lg text-xs font-medium ${
                feedback.type === "ok"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reason / Message input */}
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (for kick/ban)..."
          className="w-full mb-2 px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
        />
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message (for DM)..."
          className="w-full mb-4 px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={sending !== null}
            onClick={() => sendCommand("kick", { reason: reason || "Kicked by admin" })}
            className="px-3 py-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 text-sm font-medium hover:bg-orange-500/20 transition disabled:opacity-40"
          >
            {sending === "kick" ? "Kicking..." : "⚡ Kick"}
          </button>
          <button
            disabled={sending !== null}
            onClick={() => sendCommand("ban", { reason: reason || "Banned by admin" })}
            className="px-3 py-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition disabled:opacity-40"
          >
            {sending === "ban" ? "Banning..." : "🚫 Ban"}
          </button>
          <button
            disabled={sending !== null || !message.trim()}
            onClick={() => { sendCommand("dm", { message: message.trim() }); setMessage(""); }}
            className="px-3 py-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium hover:bg-blue-500/20 transition disabled:opacity-40"
          >
            {sending === "dm" ? "Sending..." : "💬 Send DM"}
          </button>
          <button
            disabled={sending !== null}
            onClick={() => sendCommand("info")}
            className="px-3 py-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-sm font-medium hover:bg-purple-500/20 transition disabled:opacity-40"
          >
            {sending === "info" ? "Loading..." : "📋 Get Info"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── Server Chat Input ───────────────────────── */

function ServerChat({ serverId }: { serverId: string }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await fetch("/api/servers/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          type: "chat",
          payload: { message: msg.trim() },
        }),
      });
      setMsg("");
    } catch { /* ignore */ }
    setSending(false);
  }

  return (
    <div className="mt-4 pt-4 border-t border-purple-500/10 flex gap-2">
      <input
        value={msg}
        onChange={e => setMsg(e.target.value)}
        onKeyDown={e => e.key === "Enter" && send()}
        placeholder="Type a message to game chat..."
        className="flex-1 px-3 py-2 rounded-lg bg-dark-900 border border-dark-600 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/40"
      />
      <button
        disabled={sending || !msg.trim()}
        onClick={send}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition disabled:opacity-40 shrink-0"
      >
        {sending ? "..." : "Send"}
      </button>
    </div>
  );
}

/* ───────────────────────── Player List ───────────────────────── */

function PlayerList({
  players,
  serverId,
}: {
  players: { userId: number; name: string; displayName: string }[];
  serverId: string;
}) {
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [selectedPlayer, setSelectedPlayer] = useState<typeof players[0] | null>(null);

  useEffect(() => {
    if (!players || players.length === 0) return;
    const userIds = players.map(p => p.userId);
    fetch("/api/roblox/avatars", {
      method: "POST",
      body: JSON.stringify({ userIds }),
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
    <>
      <div className="mt-4 pt-4 border-t border-purple-500/10">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Players Online ({players.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {players.map(p => (
            <button
              key={p.userId}
              onClick={() => setSelectedPlayer(p)}
              className="flex items-center gap-2 bg-dark-800/50 rounded-full pr-3 border border-purple-500/5 hover:border-purple-500/30 hover:bg-dark-700/50 transition-all cursor-pointer group"
            >
              <img
                src={avatars[p.userId] || "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39df885e827/150/150/AvatarHeadshot/Png"}
                alt={p.name}
                className="w-8 h-8 rounded-full bg-dark-900 object-cover"
              />
              <div className="flex flex-col py-1 text-left">
                <span className="text-xs font-medium text-white leading-none group-hover:text-purple-300 transition">{p.displayName}</span>
                <span className="text-[10px] text-gray-500 leading-none mt-0.5">@{p.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerModal
            player={selectedPlayer}
            serverId={serverId}
            avatarUrl={avatars[selectedPlayer.userId] || ""}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ───────────────────────── Main Page ───────────────────────── */

export default function AdminOnlineGamesPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServers = useCallback(async () => {
    try {
      const res = await window.fetch("/api/servers/active");
      const data = await res.json();
      if (data.success) setSessions(data.active || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServers();
    const id = setInterval(fetchServers, 10000);
    return () => clearInterval(id);
  }, [fetchServers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalPlayers = sessions.reduce((sum, s) => sum + (s.playerCount || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Online Games List</h1>
          <p className="text-sm text-gray-400 mt-1">
            {sessions.length} server{sessions.length !== 1 ? "s" : ""} · {totalPlayers} total players
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-gray-400 text-center py-10">No active game servers.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard>
                <div className="flex items-center gap-4">
                  {s.gameThumbnail && (
                    <img
                      src={s.gameThumbnail}
                      alt={s.gameName || ""}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-sm font-semibold text-white">{s.gameName || "Unknown Game"}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Server: <code className="text-gray-400 font-mono">{s.serverId?.slice(0, 20)}...</code>
                      </span>
                      <span>
                        Players: <span className="text-white font-medium">{s.playerCount ?? 0}/{s.maxPlayers ?? "?"}</span>
                      </span>
                      <span>
                        Universe: <code className="text-gray-400 font-mono">{s.universeId || "—"}</code>
                      </span>
                      {s.placeId && (
                        <span>
                          Place: <code className="text-gray-400 font-mono">{s.placeId}</code>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      Last heartbeat: {s.lastHeartbeat ? new Date(s.lastHeartbeat).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>

                {s.players && s.players.length > 0 && (
                  <PlayerList players={s.players} serverId={s.serverId} />
                )}

                <ServerChat serverId={s.serverId} />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
