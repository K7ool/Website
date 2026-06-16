"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import GroupDetailModal from "@/components/GroupDetailModal";
import GameDetailModal from "@/components/GameDetailModal";
import { getHistory, addToHistory, removeFromHistory, clearHistory, type SearchHistoryEntry } from "@/lib/search-history";

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

interface RobloxUserData {
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
  placeId: number | null;
  rootPlaceId: number | null;
  gameId: string | null;
  currentGame: {
    universeId: number;
    name: string;
    description: string;
    thumbnail: string;
    placeId: number;
    rootPlaceId: number;
  } | null;
  robux: number;
  userStatus: string;
  games: any[];
  favoriteGames: any[];
  groups: any[];
  badges: any[];
  collectibles: any[];
}

type Tab = "overview" | "games" | "favorites" | "groups" | "badges" | "inventory" | "friends" | "followers" | "following";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "friends", label: "Friends" },
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "games", label: "Games" },
  { key: "favorites", label: "Favorites" },
  { key: "groups", label: "Groups" },
  { key: "badges", label: "Badges" },
  { key: "inventory", label: "Collectibles" },
];

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
  const txt = copy ?? String(value);
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-sm text-white font-mono truncate text-right">{String(value) || "—"}</span>
        {txt && <CopyBtn text={txt} />}
      </div>
    </div>
  );
}

const ONLINE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Offline", color: "text-gray-500" },
  1: { label: "Online", color: "text-green-400" },
  2: { label: "In Game", color: "text-blue-400" },
  3: { label: "In Studio", color: "text-yellow-400" },
};

export default function RobloxFinderPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RobloxUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [copiedAll, setCopiedAll] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGameUniverseId, setSelectedGameUniverseId] = useState<number | null>(null);
  const [groupsOwnedOnly, setGroupsOwnedOnly] = useState(false);
  const [socialData, setSocialData] = useState<{ users: any[]; nextPageCursor: string | null; previousPageCursor: string | null; totalCount: number } | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialCursor, setSocialCursor] = useState("");
  const [selectedSocialUser, setSelectedSocialUser] = useState<number | null>(null);

  useEffect(() => {
    setHistory(getHistory("roblox"));
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setQuery(q);
      // Auto-search after a short delay to ensure state is set
      setTimeout(() => {
        setLoading(true);
        setError("");
        setData(null);
        fetch("/api/roblox/find", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        })
          .then((res) => res.json())
          .then((json) => {
            if (!json.success) {
              setError(json.error || "Failed to find user");
            } else {
              setData(json.data);
              setHistory(addToHistory("roblox", q, json.data.displayName || json.data.username || q));
            }
          })
          .catch(() => setError("Network error"))
          .finally(() => setLoading(false));
      }, 100);
    }
  }, [searchParams]);

  const search = async (searchQuery?: string) => {
    const q = searchQuery || query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setData(null);
    setSocialData(null);
    setSocialCursor("");
    try {
      const res = await fetch("/api/roblox/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to find user");
      } else {
        setData(json.data);
        setTab("overview");
        setHistory(addToHistory("roblox", q, json.data.displayName || json.data.username || q));
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const removeHistory = (q: string) => {
    setHistory(removeFromHistory("roblox", q));
  };

  const clearAllHistory = () => {
    clearHistory("roblox");
    setHistory([]);
  };

  const loadSocial = async (type: string, cursor?: string, append = false) => {
    if (!data) return;
    setSocialLoading(true);
    try {
      const url = `/api/roblox/social?userId=${data.userId}&type=${type}${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setSocialData((prev) => {
          if (append && prev) {
            return { users: [...prev.users, ...json.data.users], nextPageCursor: json.data.nextPageCursor, previousPageCursor: json.data.previousPageCursor, totalCount: json.data.totalCount };
          }
          return json.data;
        });
      }
    } catch {}
    setSocialLoading(false);
  };

  useEffect(() => {
    if (!data || !["friends", "followers", "following"].includes(tab)) return;
    setSocialCursor("");
    setSocialData(null);
    loadSocial(tab);
  }, [tab, data?.userId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  const copyAll = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {}
  };

  const online = data ? (ONLINE_LABELS[data.online] || ONLINE_LABELS[0]) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Roblox User Finder</h1>
      </div>

      <GlassCard>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Roblox username or User ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
            />
          </div>
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Searching
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </GlassCard>

      {/* Search History */}
      {history.length > 0 && (
        <GlassCard className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Recent Searches</span>
            <button onClick={clearAllHistory} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.map((entry) => (
              <div key={entry.query} className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-700/50 border border-purple-500/5 hover:border-purple-500/20 transition-all">
                <button
                  onClick={() => { setQuery(entry.query); search(entry.query); }}
                  className="text-xs text-gray-400 hover:text-white transition-colors truncate max-w-[180px]"
                  title={entry.query}
                >
                  {entry.label || entry.query}
                </button>
                <button onClick={() => removeHistory(entry.query)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {error && (
        <GlassCard className="border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </GlassCard>
      )}

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Profile Header */}
            <GlassCard>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-dark-700 border border-purple-500/10 group relative">
                    {data.avatarHeadshotHd ? (
                      <img src={proxyUrl(data.avatarHeadshotHd)} alt={data.username} className="w-full h-full object-cover" />
                    ) : data.avatarHeadshot ? (
                      <img src={proxyUrl(data.avatarHeadshot)} alt={data.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                        {data.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    {data.avatarHeadshotHd && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CopyBtn text={data.avatarHeadshotHd} label="Copy avatar URL" />
                        <span className="text-[10px] text-white ml-1">URL</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {data.avatarFull && (
                      <a href={data.avatarFull} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg overflow-hidden bg-dark-700 border border-purple-500/10 block hover:opacity-80 transition-opacity" title="Full body">
                        <img src={proxyUrl(data.avatarFull)} alt="full body" className="w-full h-full object-cover" />
                      </a>
                    )}
                    {data.avatar3d && (
                      <a href={data.avatar3d} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg overflow-hidden bg-dark-700 border border-purple-500/10 block hover:opacity-80 transition-opacity" title="3D Avatar">
                        <img src={proxyUrl(data.avatar3d)} alt="3D" className="w-full h-full object-cover" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white">{data.displayName}</h2>
                        {data.hasVerifiedBadge && (
                          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                          </svg>
                        )}
                        {data.isBanned && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-medium">Banned</span>
                        )}
                        {online && (
                          <span className={`flex items-center gap-1 text-xs ${online.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${data.online === 1 || data.online === 2 || data.online === 3 ? "bg-current animate-pulse" : "bg-current"}`} />
                            {online.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap justify-center sm:justify-start">
                        <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                          @{data.username}
                        </a>
                        <CopyBtn text={data.username} label="Copy username" />
                        <span className="text-gray-600">·</span>
                        <span className="font-mono text-xs">{data.userId}</span>
                        <CopyBtn text={String(data.userId)} label="Copy user ID" />
                      </p>
                    </div>
                    <button
                      onClick={copyAll}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs text-gray-400 hover:text-white transition-all border border-purple-500/10"
                    >
                      {copiedAll ? (
                        <><svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Copied</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> Copy All</>
                      )}
                    </button>
                  </div>

                  {data.userStatus && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400 italic px-3 py-1.5 rounded-lg bg-dark-700/50 border border-purple-500/5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                      <span className="truncate">"{data.userStatus}"</span>
                      <CopyBtn text={data.userStatus} />
                    </div>
                  )}

                  {data.description && (
                    <p className="text-sm text-gray-400 mt-3 line-clamp-3 max-w-xl">{data.description}</p>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-purple-500/10">
                {[
                  { label: "Friends", value: data.friendsCount.toLocaleString(), copy: String(data.friendsCount) },
                  { label: "Followers", value: data.followersCount.toLocaleString(), copy: String(data.followersCount) },
                  { label: "Following", value: data.followingCount.toLocaleString(), copy: String(data.followingCount) },
                  { label: "Robux", value: `${data.robux.toLocaleString()} R$`, copy: String(data.robux) },
                  { label: "Games", value: data.games.length, copy: String(data.games.length) },
                  { label: "Account Age", value: `${data.accountAgeDays}d`, copy: String(data.accountAgeDays) },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/30">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <CopyBtn text={String(s.value)} />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Detail Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3">Account Details</h3>
                <Field label="Username" value={`@${data.username}`} copy={data.username} />
                <Field label="Display Name" value={data.displayName} />
                <Field label="User ID" value={data.userId} copy={String(data.userId)} />
                <Field label="Profile URL" value="Open →" copy={data.profileUrl} />
                <Field label="Created" value={data.created ? new Date(data.created).toLocaleDateString() : "—"} copy={data.created} />
                <Field label="Age" value={`${data.accountAgeDays} days (${(data.accountAgeDays / 365).toFixed(1)} years)`} />
                <Field label="Verified Badge" value={data.hasVerifiedBadge ? "Yes" : "No"} />
                <Field label="Banned" value={data.isBanned ? "Yes" : "No"} />
              </GlassCard>

              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3">Presence & Economy</h3>
                <Field label="Status" value={online?.label || "Unknown"} />
                {data.online === 2 && data.currentGame && (
                  <div className="py-2 border-b border-purple-500/5 space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-dark-700/50">
                      {data.currentGame.thumbnail ? (
                        <img src={proxyUrl(data.currentGame.thumbnail)} alt="" className="w-10 h-10 rounded object-cover bg-dark-600" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-dark-600 flex items-center justify-center text-gray-600">🎮</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{data.currentGame.name}</p>
                        <p className="text-xs text-gray-500 truncate">{data.lastLocation}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <a
                          href={`roblox://placeId=${data.currentGame.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-all flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          Join
                        </a>
                        <a
                          href={`https://www.roblox.com/games/start?placeId=${data.currentGame.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-dark-600 hover:bg-dark-500 text-white text-xs font-medium transition-all border border-purple-500/10"
                          title="Open in browser"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                {data.online === 2 && data.gameId && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5 last:border-0">
                    <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Server ID</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm text-white font-mono truncate text-right text-xs">{data.gameId}</span>
                      <CopyBtn text={data.gameId} />
                    </div>
                  </div>
                )}
                {data.online !== 2 && data.lastLocation && <Field label="Last Location" value={data.lastLocation} />}
                <Field label="Last Online" value={data.lastOnline ? new Date(data.lastOnline).toLocaleString() : "—"} copy={data.lastOnline || ""} />
                <Field label="Robux" value={`${data.robux.toLocaleString()} R$`} copy={String(data.robux)} />
                <Field label="Friends" value={data.friendsCount.toLocaleString()} copy={String(data.friendsCount)} />
                <Field label="Followers" value={data.followersCount.toLocaleString()} copy={String(data.followersCount)} />
                <Field label="Following" value={data.followingCount.toLocaleString()} copy={String(data.followingCount)} />
                <Field label="User Status" value={data.userStatus || "—"} copy={data.userStatus} />
              </GlassCard>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {TABS.map((t) => {
                const count = t.key === "games" ? data.games.length
                  : t.key === "favorites" ? data.favoriteGames.length
                  : t.key === "groups" ? data.groups.length
                  : t.key === "badges" ? data.badges.length
                  : t.key === "inventory" ? data.collectibles.length
                  : 0;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab === t.key
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                        : "text-gray-400 hover:text-gray-200 border border-transparent"
                    }`}
                  >
                    {t.label}
                    {count > 0 && <span className="ml-1.5 text-xs text-gray-500">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.games.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-3">Recent Games</h3>
                    <div className="space-y-2">
                      {data.games.slice(0, 5).map((game: any) => {
                        const universeId = game.universeId || game.id;
                        return (
                          <button key={game.id} onClick={() => setSelectedGameUniverseId(universeId)}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors w-full text-left"
                          >
                            {game.image ? (
                              <img src={proxyUrl(game.image)} alt="" className="w-10 h-10 rounded object-cover bg-dark-700" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center text-gray-600">🎮</div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">{game.name}</p>
                              <p className="text-[10px] text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        );
                      })}
                    </div>
                    {data.games.length > 5 && (
                      <button onClick={() => setTab("games")} className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        View all {data.games.length} games →
                      </button>
                    )}
                  </GlassCard>
                )}
                {data.groups.length > 0 && (
                  <GlassCard>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Groups</h3>
                      <button
                        onClick={() => setGroupsOwnedOnly(!groupsOwnedOnly)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                          groupsOwnedOnly
                            ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                            : "bg-dark-700 text-gray-500 border-purple-500/10 hover:text-gray-300"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        {groupsOwnedOnly ? "Owned" : "All"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(groupsOwnedOnly ? data.groups.filter((g: any) => g.rank === 255) : data.groups.slice(0, 5)).map((group: any) => (
                        <button key={group.id} onClick={() => setSelectedGroupId(group.id)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors w-full text-left"
                        >
                          {group.emblemUrl ? (
                            <img src={proxyUrl(group.emblemUrl)} alt="" className="w-10 h-10 rounded object-cover bg-dark-700" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center text-gray-600">👥</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{group.name}</p>
                            <p className="text-[10px] text-gray-500">{group.role} (Rank {group.rank})</p>
                          </div>
                          {group.rank === 255 && (
                            <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          )}
                          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      ))}
                    </div>
                    {!groupsOwnedOnly && data.groups.length > 5 && (
                      <button onClick={() => setTab("groups")} className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        View all {data.groups.length} groups →
                      </button>
                    )}
                  </GlassCard>
                )}
                {data.badges.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-3">Recent Badges</h3>
                    <div className="flex flex-wrap gap-2">
                      {data.badges.slice(0, 12).map((badge: any) => (
                        <div key={badge.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-700 text-xs text-gray-300">
                          {badge.imageUrl && <img src={proxyUrl(badge.imageUrl)} alt="" className="w-4 h-4 rounded" />}
                          <span className="truncate max-w-28">{badge.name}</span>
                        </div>
                      ))}
                    </div>
                    {data.badges.length > 12 && (
                      <button onClick={() => setTab("badges")} className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        View all {data.badges.length} badges →
                      </button>
                    )}
                  </GlassCard>
                )}
                {data.collectibles.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-3">Collectibles</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {data.collectibles.slice(0, 10).map((item: any) => (
                        <div key={item.assetId} className="flex flex-col items-center gap-1 p-1 rounded-lg bg-dark-700">
                          {item.thumbnailUrl ? (
                            <img src={proxyUrl(item.thumbnailUrl)} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-dark-800 flex items-center justify-center text-xs text-gray-600">?</div>
                          )}
                        </div>
                      ))}
                    </div>
                    {data.collectibles.length > 10 && (
                      <button onClick={() => setTab("inventory")} className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                        View all {data.collectibles.length} collectibles →
                      </button>
                    )}
                  </GlassCard>
                )}
              </div>
            )}

            {tab === "games" && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Games ({data.games.length})</h3>
                  <CopyBtn text={JSON.stringify(data.games.map((g: any) => g.name))} label="Copy game names" />
                </div>
                {data.games.length === 0 ? (
                  <p className="text-sm text-gray-500">No public games found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.games.map((game: any) => {
                      const universeId = game.universeId || game.id;
                      return (
                        <button key={game.id} onClick={() => setSelectedGameUniverseId(universeId)}
                          className="block p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5 group text-left w-full"
                        >
                          {game.image && <img src={proxyUrl(game.image)} alt="" className="w-full aspect-video rounded object-cover bg-dark-600 mb-2" />}
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm text-white font-medium truncate">{game.name}</p>
                            <CopyBtn text={game.name} />
                          </div>
                          <p className="text-xs text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                          {game.playing && <p className="text-xs text-green-400">{game.playing} playing now</p>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            )}

            {tab === "favorites" && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Favorite Games ({data.favoriteGames.length})</h3>
                  <CopyBtn text={JSON.stringify(data.favoriteGames.map((g: any) => g.name))} label="Copy favorite names" />
                </div>
                {data.favoriteGames.length === 0 ? (
                  <p className="text-sm text-gray-500">No favorite games found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.favoriteGames.map((game: any) => {
                      const universeId = game.universeId || game.id;
                      return (
                        <button key={game.id} onClick={() => setSelectedGameUniverseId(universeId)}
                          className="block p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5 text-left w-full"
                        >
                          {game.image && <img src={proxyUrl(game.image)} alt="" className="w-full aspect-video rounded object-cover bg-dark-600 mb-2" />}
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm text-white font-medium truncate">{game.name}</p>
                            <CopyBtn text={game.name} />
                          </div>
                          <p className="text-xs text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            )}

            {tab === "groups" && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">
                    Groups ({groupsOwnedOnly ? data.groups.filter((g: any) => g.rank === 255).length : data.groups.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGroupsOwnedOnly(!groupsOwnedOnly)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                        groupsOwnedOnly
                          ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                          : "bg-dark-700 text-gray-500 border-purple-500/10 hover:text-gray-300"
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      {groupsOwnedOnly ? "Owned Only" : "Show Owned"}
                    </button>
                    <CopyBtn text={JSON.stringify(data.groups.map((g: any) => g.name))} label="Copy group names" />
                  </div>
                </div>
                {data.groups.length === 0 ? (
                  <p className="text-sm text-gray-500">No groups found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(groupsOwnedOnly ? data.groups.filter((g: any) => g.rank === 255) : data.groups).map((group: any) => (
                      <button key={group.id} onClick={() => setSelectedGroupId(group.id)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5 text-left w-full"
                      >
                        {group.emblemUrl ? (
                          <img src={proxyUrl(group.emblemUrl)} alt="" className="w-12 h-12 rounded object-cover bg-dark-600" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-dark-600 flex items-center justify-center text-lg">👥</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-white font-medium truncate">{group.name}</p>
                            {group.rank === 255 && (
                              <svg className="w-3.5 h-3.5 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            )}
                            <CopyBtn text={group.name} />
                          </div>
                          <p className="text-xs text-purple-400">{group.role}</p>
                          <p className="text-[10px] text-gray-600">Rank {group.rank}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                )}
                {groupsOwnedOnly && data.groups.filter((g: any) => g.rank === 255).length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">No owned groups found</p>
                )}
              </GlassCard>
            )}

            {tab === "badges" && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Badges ({data.badges.length})</h3>
                  <CopyBtn text={JSON.stringify(data.badges.map((b: any) => b.name))} label="Copy badge names" />
                </div>
                {data.badges.length === 0 ? (
                  <p className="text-sm text-gray-500">No badges found.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.badges.map((badge: any) => (
                      <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50 border border-purple-500/5">
                        {badge.imageUrl && <img src={proxyUrl(badge.imageUrl)} alt="" className="w-6 h-6 rounded" />}
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-white">{badge.name}</p>
                            <CopyBtn text={badge.name} />
                          </div>
                          {badge.description && <p className="text-[10px] text-gray-500 line-clamp-1 max-w-40">{badge.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {(["friends", "followers", "following"] as Tab[]).includes(tab) && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white capitalize">
                    {tab} ({socialData?.totalCount ?? "..."})
                  </h3>
                </div>
                {!socialData && socialLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !socialData || socialData.users.length === 0 ? (
                  <p className="text-sm text-gray-500">No {tab} found.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {socialData.users.map((user: any) => (
                        <div
                          key={user.userId}
                          className="flex items-center gap-3 p-2 rounded-lg bg-dark-700/30 border border-purple-500/5 hover:bg-purple-500/5 transition-all group cursor-pointer"
                          onClick={() => {
                            setSelectedSocialUser(user.userId);
                            setQuery(String(user.userId));
                            setTimeout(() => { search(String(user.userId)); }, 50);
                          }}
                        >
                          <div className="w-9 h-9 rounded-full bg-dark-600 overflow-hidden shrink-0 border border-purple-500/10">
                            <img
                              src={`/api/roblox/avatar?userId=${user.userId}&circle=1`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=6366f1&color=fff&size=150`; }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-white hover:text-purple-400 transition-colors truncate">
                                {user.displayName}
                              </span>
                              {user.hasVerifiedBadge && (
                                <svg className="w-3 h-3 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] text-gray-500 truncate">@{user.username}</p>
                              {user.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Online" />}
                            </div>
                          </div>
                          <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      ))}
                    </div>
                    {socialData.nextPageCursor && (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={() => loadSocial(tab, socialData.nextPageCursor!, true)}
                          disabled={socialLoading}
                          className="px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-all border border-purple-500/20 disabled:opacity-50"
                        >
                          {socialLoading ? "Loading..." : "Load More"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </GlassCard>
            )}

            {tab === "inventory" && (
              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Collectibles ({data.collectibles.length})</h3>
                  <CopyBtn text={JSON.stringify(data.collectibles.map((c: any) => c.name))} label="Copy collectible names" />
                </div>
                {data.collectibles.length === 0 ? (
                  <p className="text-sm text-gray-500">No collectibles found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {data.collectibles.map((item: any) => (
                      <div key={item.assetId} className="p-2 rounded-lg bg-dark-700/50 border border-purple-500/5 text-center group">
                        <div className="relative">
                          {item.thumbnailUrl ? (
                            <img src={proxyUrl(item.thumbnailUrl)} alt="" className="w-full aspect-square rounded object-cover bg-dark-600" />
                          ) : (
                            <div className="w-full aspect-square rounded bg-dark-600 flex items-center justify-center text-gray-600 text-xs">No img</div>
                          )}
                          <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyBtn text={item.name || String(item.assetId)} />
                          </div>
                        </div>
                        {item.name && <p className="text-[10px] text-gray-400 mt-1 truncate">{item.name}</p>}
                        {item.recentAveragePrice && (
                          <p className="text-[10px] text-green-400">{item.recentAveragePrice.toLocaleString()} R$</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedGroupId && (
        <GroupDetailModal groupId={selectedGroupId} onClose={() => setSelectedGroupId(null)} onMemberClick={(userId) => { setSelectedGroupId(null); setQuery(String(userId)); setTimeout(() => search(String(userId)), 100); }} />
      )}

      {selectedGameUniverseId && (
        <GameDetailModal universeId={selectedGameUniverseId} onClose={() => setSelectedGameUniverseId(null)} />
      )}
    </div>
  );
}
