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
  favoriteGames: any[];
  groups: any[];
  badges: any[];
  collectibles: any[];
}

const PRESENCE: Record<number, { label: string; color: string; dot: string; bg: string }> = {
  0: { label: "Offline", color: "text-gray-500", dot: "bg-gray-500", bg: "bg-gray-500/10" },
  1: { label: "Online", color: "text-green-400", dot: "bg-green-400", bg: "bg-green-500/10" },
  2: { label: "In Game", color: "text-blue-400", dot: "bg-blue-400", bg: "bg-blue-500/10" },
  3: { label: "In Studio", color: "text-yellow-400", dot: "bg-yellow-400", bg: "bg-yellow-500/10" },
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
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
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
  const [activeSection, setActiveSection] = useState<"overview" | "games" | "groups" | "badges">("overview");

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
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="bg-dark-800/98 backdrop-blur-2xl border border-purple-500/20 rounded-3xl shadow-2xl shadow-purple-900/30 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading profile...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-purple-600/20 text-purple-300 text-sm hover:bg-purple-600/30 transition-all border border-purple-500/20">Close</button>
            </div>
          ) : data ? (
            <>
              {/* Hero Header */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 via-blue-600/5 to-transparent" />
                <div className="relative p-6 pb-4">
                  <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-gray-500 hover:text-white transition-all" title="Close">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="flex items-start gap-5">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-lg shadow-purple-900/20">
                        <img src={proxyUrl(data.avatarHeadshotHd || data.avatarHeadshot)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-dark-800 ${pres.dot}`} title={pres.label} />
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white truncate">{data.displayName}</h2>
                        {data.hasVerifiedBadge && (
                          <svg className="w-5 h-5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                        )}
                        {data.isBanned && <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-xs font-medium">Banned</span>}
                      </div>
                      <p className="text-sm text-gray-400 mb-2">@{data.username}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${pres.bg} ${pres.color}`}>
                          <span className={`w-2 h-2 rounded-full ${pres.dot}`} />
                          {pres.label}
                        </span>
                        {data.online === 2 && data.currentGame && (
                          <span className="text-xs text-blue-300 truncate max-w-48">Playing {data.currentGame.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {data.userStatus && (
                    <div className="mt-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                      <p className="text-xs text-gray-400 italic">&ldquo;{data.userStatus}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Friends", value: data.friendsCount, icon: "👥" },
                    { label: "Followers", value: data.followersCount, icon: "👤" },
                    { label: "Following", value: data.followingCount, icon: "↗" },
                    { label: "Robux", value: data.robux, icon: "R$" },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-3 rounded-xl bg-dark-700/50 border border-purple-500/5 hover:border-purple-500/15 transition-all">
                      <p className="text-lg font-bold text-white">{s.value.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Tabs */}
              <div className="px-6 border-b border-purple-500/10">
                <div className="flex gap-1">
                  {([["overview", "Overview"], ["games", `Games (${data.games.length})`], ["groups", `Groups (${data.groups.length})`], ["badges", `Badges (${data.badges.length})`]] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setActiveSection(key as any)}
                      className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
                        activeSection === key
                          ? "border-purple-400 text-purple-300"
                          : "border-transparent text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-6">
                {activeSection === "overview" && (
                  <div className="space-y-5">
                    {/* Details */}
                    <div className="p-4 rounded-xl bg-dark-700/30 border border-purple-500/5">
                      <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Account Details</h4>
                      <div className="space-y-0.5">
                        <Field label="User ID" value={data.userId} copy={String(data.userId)} />
                        <Field label="Username" value={`@${data.username}`} copy={data.username} />
                        <Field label="Display Name" value={data.displayName} copy={data.displayName} />
                        <Field label="Account Age" value={`${ageYears}y ${ageMonths}m ${ageDays}d`} copy={`${data.accountAgeDays} days`} />
                        <Field label="Created" value={new Date(data.created).toLocaleDateString()} />
                        {data.lastOnline && <Field label="Last Online" value={new Date(data.lastOnline).toLocaleString()} />}
                        {data.lastLocation && <Field label="Last Location" value={data.lastLocation} />}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <a href={`https://www.roblox.com/users/${data.userId}/profile`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-all border border-purple-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open Profile
                      </a>
                      <a href={`https://www.roblox.com/users/${data.userId}/profile`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-sm font-medium transition-all border border-blue-500/20">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        Add Friend
                      </a>
                      {data.currentGame && (
                        <a href={`https://www.roblox.com/games/${data.currentGame.placeId}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600/20 hover:bg-green-600/30 text-green-300 text-sm font-medium transition-all border border-green-500/20">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Join Game
                        </a>
                      )}
                    </div>

                    {/* Current Game */}
                    {data.currentGame && (
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Currently Playing</h4>
                        <div className="flex items-center gap-4">
                          {data.currentGame.thumbnail && (
                            <img src={proxyUrl(data.currentGame.thumbnail)} alt="" className="w-20 h-20 rounded-xl object-cover bg-dark-600 border border-blue-500/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-base text-white font-semibold truncate">{data.currentGame.name}</p>
                            {data.currentGame.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{data.currentGame.description}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "games" && (
                  <div>
                    {data.games.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No games found</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                        {data.games.map((g: any) => (
                          <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-dark-700/50 border border-purple-500/5 hover:border-purple-500/20 transition-all text-center group">
                            {g.image ? (
                              <img src={proxyUrl(g.image)} alt="" className="w-full aspect-square rounded-lg object-cover bg-dark-600" />
                            ) : (
                              <div className="w-full aspect-square rounded-lg bg-dark-600 flex items-center justify-center text-gray-600 text-xs">No img</div>
                            )}
                            <p className="text-[10px] text-gray-400 mt-1.5 truncate group-hover:text-purple-300">{g.name}</p>
                            {g.visits > 0 && <p className="text-[9px] text-gray-600">{g.visits.toLocaleString()} visits</p>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "groups" && (
                  <div>
                    {data.groups.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No groups found</p>
                    ) : (
                      <div className="space-y-2">
                        {data.groups.map((g: any) => (
                          <a key={g.id} href={`https://www.roblox.com/groups/${g.id}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 border border-purple-500/5 hover:bg-purple-500/5 transition-all group">
                            {g.emblemUrl ? (
                              <img src={proxyUrl(g.emblemUrl)} alt="" className="w-12 h-12 rounded-lg object-cover bg-dark-600" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-dark-600 flex items-center justify-center text-gray-600 text-sm font-bold">G</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate group-hover:text-purple-300">{g.name}</p>
                              <p className="text-xs text-gray-500">{g.role}</p>
                            </div>
                            <span className="text-xs text-gray-600 font-mono">#{g.rank}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "badges" && (
                  <div>
                    {data.badges.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No badges found</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {data.badges.map((b: any) => (
                          <div key={b.id} className="group relative p-1 rounded-xl bg-dark-700/30 border border-purple-500/5 hover:border-purple-500/20 transition-all" title={b.name}>
                            {b.imageUrl ? (
                              <img src={proxyUrl(b.imageUrl)} alt="" className="w-full aspect-square rounded-lg object-cover bg-dark-600" />
                            ) : (
                              <div className="w-full aspect-square rounded-lg bg-dark-600 flex items-center justify-center text-gray-600 text-xs">B</div>
                            )}
                            <p className="text-[9px] text-gray-500 mt-1 truncate">{b.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
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
