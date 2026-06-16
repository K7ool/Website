"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UserData {
  userId: number;
  username: string;
  displayName: string;
  description: string;
  created: string;
  accountAgeDays: number;
  profileUrl: string;
  avatarHeadshot: string;
  avatarHeadshotHd: string;
  avatarFull: string;
  avatar3d: string;
  isBanned: boolean;
  hasVerifiedBadge: boolean;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  online: number;
  lastOnline: string;
  lastLocation: string;
  currentGame: {
    universeId: number;
    name: string;
    description: string;
    thumbnail: string;
    placeId: number;
    rootPlaceId: number;
    url: string;
  } | null;
  robux: number;
  userStatus: string;
  games: any[];
  groups: any[];
  badges: any[];
  collectibles: any[];
}

const PRESENCE: Record<number, { label: string; color: string; dot: string }> = {
  0: { label: "Offline", color: "text-gray-500", dot: "bg-gray-500" },
  1: { label: "Online", color: "text-green-400", dot: "bg-green-400" },
  2: { label: "In Game", color: "text-blue-400", dot: "bg-blue-400" },
  3: { label: "In Studio", color: "text-yellow-400", dot: "bg-yellow-400" },
};

function proxyUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("rbxcdn.com") || u.hostname.includes("roblox.com")) {
      return `/api/roblox/image?url=${encodeURIComponent(url)}`;
    }
  } catch {}
  return url;
}

function CopyBtn({ text, label }: { text: string | number; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [text]);
  return (
    <button onClick={copy} title={label || `Copy "${text}"`} className="shrink-0 p-1 rounded hover:bg-white/10 transition-all text-gray-500 hover:text-purple-400">
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      )}
    </button>
  );
}

function Field({ label, value, copy }: { label: string; value: string | number; copy?: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-sm text-white font-mono truncate text-right">{String(value) || "—"}</span>
        {copy !== undefined && <CopyBtn text={copy} />}
      </div>
    </div>
  );
}

export default function UserDetailModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/roblox/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: String(userId) }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || "Failed to load user");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [userId]);

  const pres = PRESENCE[data?.online ?? 0] || PRESENCE[0];
  const ageYears = data ? Math.floor(data.accountAgeDays / 365) : 0;
  const ageMonths = data ? Math.floor((data.accountAgeDays % 365) / 30) : 0;
  const ageDays = data ? data.accountAgeDays % 30 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-dark-800/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/20 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 text-sm hover:bg-purple-600/30">Close</button>
            </div>
          ) : data ? (
            <>
              {/* Header */}
              <div className="relative p-4 pb-3 border-b border-purple-500/10">
                <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Close">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-500/30">
                      <img src={proxyUrl(data.avatarHeadshot)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-dark-800 ${pres.dot}`} title={pres.label} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-white truncate">{data.displayName}</h3>
                      {data.hasVerifiedBadge && (
                        <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                      )}
                      {data.isBanned && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium">Banned</span>}
                    </div>
                    <p className="text-xs text-gray-500">@{data.username}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[11px] font-medium ${pres.color}`}>{pres.label}</span>
                      {data.online === 2 && data.currentGame && (
                        <span className="text-[11px] text-blue-300">— {data.currentGame.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Status */}
                {data.userStatus && (
                  <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-xs text-gray-400 italic">"{data.userStatus}"</p>
                  </div>
                )}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Friends", value: data.friendsCount },
                    { label: "Followers", value: data.followersCount },
                    { label: "Following", value: data.followingCount },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/50 border border-purple-500/5">
                      <p className="text-sm font-bold text-white">{s.value.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Details */}
                <div className="space-y-0.5">
                  <Field label="User ID" value={data.userId} copy={String(data.userId)} />
                  <Field label="Username" value={`@${data.username}`} copy={data.username} />
                  <Field label="Display Name" value={data.displayName} copy={data.displayName} />
                  <Field label="Account Age" value={`${ageYears}y ${ageMonths}m ${ageDays}d`} copy={data.accountAgeDays + " days"} />
                  <Field label="Created" value={new Date(data.created).toLocaleDateString()} />
                  <Field label="Robux" value={data.robux.toLocaleString()} />
                  {data.lastOnline && <Field label="Last Online" value={new Date(data.lastOnline).toLocaleString()} />}
                  {data.lastLocation && <Field label="Last Location" value={data.lastLocation} />}
                </div>

                {/* Current Game */}
                {data.currentGame && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Currently Playing</p>
                    <div className="flex items-center gap-3">
                      {data.currentGame.thumbnail && (
                        <img src={proxyUrl(data.currentGame.thumbnail)} alt="" className="w-14 h-14 rounded-lg object-cover bg-dark-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{data.currentGame.name}</p>
                        <div className="flex gap-2 mt-1.5">
                          <a href={`https://www.roblox.com/games/${data.currentGame.placeId}`} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md bg-green-600/20 hover:bg-green-600/30 text-green-300 text-[11px] font-medium transition-all">
                            Play
                          </a>
                          <a href={`https://www.roblox.com/users/${data.userId}/profile`} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[11px] font-medium transition-all">
                            Profile
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Games */}
                {data.games.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Games ({data.games.length})</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {data.games.slice(0, 6).map((g: any) => (
                        <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-dark-700/50 border border-purple-500/5 hover:border-purple-500/20 transition-all text-center group">
                          {g.image ? (
                            <img src={proxyUrl(g.image)} alt="" className="w-full aspect-square rounded object-cover bg-dark-600" />
                          ) : (
                            <div className="w-full aspect-square rounded bg-dark-600 flex items-center justify-center text-gray-600 text-xs">No img</div>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1 truncate group-hover:text-purple-300">{g.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Groups */}
                {data.groups.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Groups ({data.groups.length})</p>
                    <div className="space-y-1">
                      {data.groups.slice(0, 5).map((g: any) => (
                        <a key={g.id} href={`https://www.roblox.com/groups/${g.id}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-dark-700/30 border border-purple-500/5 hover:bg-purple-500/5 transition-all group">
                          {g.emblemUrl ? (
                            <img src={proxyUrl(g.emblemUrl)} alt="" className="w-8 h-8 rounded object-cover bg-dark-600" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-dark-600 flex items-center justify-center text-gray-600 text-xs">G</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-white truncate group-hover:text-purple-300">{g.name}</p>
                            <p className="text-[10px] text-gray-500">{g.role}</p>
                          </div>
                          <span className="text-[10px] text-gray-600 font-mono">#{g.rank}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges */}
                {data.badges.length > 0 && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Badges ({data.badges.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.badges.slice(0, 12).map((b: any) => (
                        <div key={b.id} className="group relative" title={b.name}>
                          {b.imageUrl ? (
                            <img src={proxyUrl(b.imageUrl)} alt="" className="w-9 h-9 rounded-lg object-cover bg-dark-600 border border-purple-500/5" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-dark-600 border border-purple-500/5 flex items-center justify-center text-gray-600 text-xs">B</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
