"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import GroupDetailModal from "@/components/GroupDetailModal";
import { getHistory, addToHistory, removeFromHistory, clearHistory, type SearchHistoryEntry } from "@/lib/search-history";
import { getManualLink, setManualLink as saveManualLink, removeManualLink, type ManualRobloxLink } from "@/lib/manual-roblox-links";

interface DiscordBadge {
  name: string;
  icon: string;
}

interface DiscordSnowflake {
  workerId: number;
  processId: number;
  sequence: number;
  timestampMs: number;
}

interface DiscordAge {
  years: number;
  months: number;
  days: number;
  total: number;
}

interface RobloxAccount {
  linked: boolean;
  isManual?: boolean;
  robloxId?: number;
  username?: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  avatarHeadshot?: string;
  avatarHeadshotHd?: string;
  avatarFull?: string;
  avatar3d?: string;
  created?: string | null;
  accountAgeDays?: number;
  accountAge?: DiscordAge;
  profileUrl?: string;
  isBanned?: boolean;
  hasVerifiedBadge?: boolean;
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  online?: number;
  lastOnline?: string;
  lastLocation?: string;
  placeId?: number | null;
  rootPlaceId?: number | null;
  gameId?: string | null;
  currentGame?: {
    universeId: number;
    name: string;
    description: string;
    thumbnail: string;
    placeId: number;
    rootPlaceId: number;
  } | null;
  robux?: number;
  userStatus?: string;
  games?: any[];
  favoriteGames?: any[];
  groups?: any[];
  badges?: any[];
  collectibles?: any[];
}

interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  globalName: string;
  avatarUrl: string;
  bannerUrl: string;
  bannerColor: string | null;
  accentColor: number | null;
  badges: DiscordBadge[];
  avatarDecoration: string | null;
  createdAt: string | null;
  createdAtFormatted: string | null;
  createdAtTime: string | null;
  accountAgeDays: number;
  accountAge: DiscordAge;
  profileUrl: string;
  snowflake: DiscordSnowflake | null;
  robloxAccount: RobloxAccount | null;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
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

function Field({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5 last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-sm text-white font-mono truncate text-right">{value || "—"}</span>
        {copy && <CopyBtn text={copy} />}
      </div>
    </div>
  );
}

function RobloxField({ label, value, copy }: { label: string; value: string | number; copy?: string | number }) {
  const txt = copy !== undefined ? String(copy) : String(value);
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-purple-500/5 last:border-0">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs text-white font-mono truncate text-right">{String(value) || "—"}</span>
        {txt && <CopyBtn text={txt} />}
      </div>
    </div>
  );
}

function DownloadBtn({ url, filename }: { url: string; filename: string }) {
  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {}
  };
  return (
    <button onClick={download} title="Download" className="p-1 rounded hover:bg-white/10 transition-all text-gray-500 hover:text-green-400">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    </button>
  );
}

export default function DiscordFinderPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DiscordUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [manualLink, setManualLinkState] = useState<ManualRobloxLink | null>(null);
  const [linkUsername, setLinkUsername] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupsOwnedOnly, setGroupsOwnedOnly] = useState(false);

  useEffect(() => {
    setHistory(getHistory("discord"));
  }, []);

  useEffect(() => {
    if (data?.id) {
      setManualLinkState(getManualLink(data.id));
    }
  }, [data?.id]);

  const linkRobloxAccount = async () => {
    const username = linkUsername.trim();
    if (!username || !data?.id) return;
    setLinking(true);
    setLinkError("");
    try {
      const res = await fetch("/api/roblox/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: username }),
      });
      const json = await res.json();
      if (!json.success || !json.data) {
        setLinkError(json.error || "Roblox user not found");
        return;
      }
      const d = json.data;
      saveManualLink(data.id, d.userId, d.username);
      setManualLinkState(getManualLink(data.id));
      setLinkUsername("");
      setData((prev) => prev ? {
        ...prev,
        robloxAccount: {
          linked: true,
          isManual: true,
          robloxId: d.userId,
          username: d.username,
          displayName: d.displayName,
          description: d.description,
          avatarUrl: d.avatarHeadshotHd || d.avatarHeadshot || "",
          avatarHeadshot: d.avatarHeadshot,
          avatarHeadshotHd: d.avatarHeadshotHd,
          avatarFull: d.avatarFull,
          avatar3d: d.avatar3d,
          created: d.created,
          accountAgeDays: d.accountAgeDays,
          accountAge: d.accountAge,
          profileUrl: d.profileUrl,
          isBanned: d.isBanned,
          hasVerifiedBadge: d.hasVerifiedBadge,
          friendsCount: d.friendsCount,
          followersCount: d.followersCount,
          followingCount: d.followingCount,
          online: d.online,
          lastOnline: d.lastOnline,
          lastLocation: d.lastLocation,
          placeId: d.placeId,
          rootPlaceId: d.rootPlaceId,
          gameId: d.gameId,
          currentGame: d.currentGame,
          robux: d.robux,
          userStatus: d.userStatus,
          games: d.games,
          favoriteGames: d.favoriteGames,
          groups: d.groups,
          badges: d.badges,
          collectibles: d.collectibles,
        },
      } : prev);
    } catch {
      setLinkError("Failed to look up Roblox user");
    } finally {
      setLinking(false);
    }
  };

  const unlinkRobloxAccount = () => {
    if (!data?.id) return;
    removeManualLink(data.id);
    setManualLinkState(null);
    setData((prev) => prev ? {
      ...prev,
      robloxAccount: { linked: false },
    } : prev);
  };

  const search = async (searchQuery?: string) => {
    const q = searchQuery || query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/discord/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: q }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to find user");
      } else {
        const userData = json.data;
        setData(userData);
        setHistory(addToHistory("discord", q, userData.globalName || userData.username || q));

        // Check for manual Roblox link and fetch full data if needed
        const link = getManualLink(userData.id);
        setManualLinkState(link);
        if (link && link.robloxId && (!userData.robloxAccount?.linked || !userData.robloxAccount?.robloxId)) {
          try {
            const robloxRes = await fetch("/api/roblox/find", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: String(link.robloxId) }),
            });
            const robloxJson = await robloxRes.json();
            if (robloxJson.success && robloxJson.data) {
              const d = robloxJson.data;
              setData((prev) => prev ? {
                ...prev,
                robloxAccount: {
                  linked: true,
                  isManual: true,
                  robloxId: d.userId,
                  username: d.username,
                  displayName: d.displayName,
                  description: d.description,
                  avatarUrl: d.avatarHeadshotHd || d.avatarHeadshot || "",
                  avatarHeadshot: d.avatarHeadshot,
                  avatarHeadshotHd: d.avatarHeadshotHd,
                  avatarFull: d.avatarFull,
                  avatar3d: d.avatar3d,
                  created: d.created,
                  accountAgeDays: d.accountAgeDays,
                  accountAge: d.accountAge,
                  profileUrl: d.profileUrl,
                  isBanned: d.isBanned,
                  hasVerifiedBadge: d.hasVerifiedBadge,
                  friendsCount: d.friendsCount,
                  followersCount: d.followersCount,
                  followingCount: d.followingCount,
                  online: d.online,
                  lastOnline: d.lastOnline,
                  lastLocation: d.lastLocation,
                  placeId: d.placeId,
                  rootPlaceId: d.rootPlaceId,
                  gameId: d.gameId,
                  currentGame: d.currentGame,
                  robux: d.robux,
                  userStatus: d.userStatus,
                  games: d.games,
                  favoriteGames: d.favoriteGames,
                  groups: d.groups,
                  badges: d.badges,
                  collectibles: d.collectibles,
                },
              } : prev);
            }
          } catch {}
        }
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const removeHistory = (q: string) => {
    setHistory(removeFromHistory("discord", q));
  };

  const clearAllHistory = () => {
    clearHistory("discord");
    setHistory([]);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Discord User Finder</h1>
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
              placeholder="Enter Discord User ID (17-20 digits)..."
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
              {data.bannerUrl && (
                <div className="w-full h-32 rounded-lg overflow-hidden mb-4 -mt-2 -mx-2 relative">
                  <img src={data.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  {data.bannerColor && (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(transparent 60%, ${data.bannerColor}88)` }} />
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-2 shrink-0 -mt-16 sm:-mt-12 relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-700 border-4 border-dark-900 group relative">
                    {data.avatarUrl ? (
                      <img src={data.avatarUrl} alt={data.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600 bg-indigo-500/20">
                        {data.username?.[0]?.toUpperCase() || data.id?.[0] || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full gap-2">
                      <CopyBtn text={data.avatarUrl} label="Copy avatar URL" />
                      {data.avatarUrl && <DownloadBtn url={data.avatarUrl} filename={`avatar_${data.id}.png`} />}
                    </div>
                  </div>
                  {data.avatarDecoration && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-dark-700 border border-purple-500/30 overflow-hidden" title="Avatar Decoration">
                      <img src={`https://cdn.discordapp.com/avatar-decoration-presets/${data.avatarDecoration}.png`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white">{data.globalName || data.username}</h2>
                        {data.discriminator !== "0" && (
                          <span className="text-sm text-gray-400">#{data.discriminator}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap justify-center sm:justify-start">
                        <span className="text-purple-400">@{data.username}</span>
                        <span className="text-gray-600">·</span>
                        <span className="font-mono text-xs">{data.id}</span>
                        <CopyBtn text={data.id} label="Copy user ID" />
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={data.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Profile
                      </a>
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
                  </div>

                  {/* Badges */}
                  {data.badges.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {data.badges.map((badge) => (
                        <span key={badge.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-medium border border-purple-500/20">
                          <span>{badge.icon}</span>
                          {badge.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-4 border-t border-purple-500/10">
                {[
                  { label: "Account Age", value: `${data.accountAge.years}y ${data.accountAge.months}m`, copy: String(data.accountAgeDays) },
                  { label: "Days", value: data.accountAgeDays.toLocaleString(), copy: String(data.accountAgeDays) },
                  { label: "Badges", value: String(data.badges.length), copy: String(data.badges.length) },
                  { label: "Has Banner", value: data.bannerUrl ? "Yes" : "No", copy: data.bannerUrl || "No" },
                  { label: "Has Decoration", value: data.avatarDecoration ? "Yes" : "No", copy: data.avatarDecoration || "No" },
                  { label: "ID Length", value: `${data.id.length} digits`, copy: String(data.id.length) },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/30">
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-lg font-bold text-white">{s.value}</p>
                      <CopyBtn text={s.copy} />
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
                <Field label="Display Name" value={data.globalName || data.username} />
                <Field label="User ID" value={data.id} copy={data.id} />
                <Field label="Discriminator" value={data.discriminator !== "0" ? `#${data.discriminator}` : "Migrated (0)"} copy={data.discriminator} />
                <Field label="Profile URL" value="Open →" copy={data.profileUrl} />
                {data.createdAtFormatted && (
                  <Field label="Created" value={`${data.createdAtFormatted} at ${data.createdAtTime}`} copy={data.createdAt || ""} />
                )}
                <Field label="Account Age" value={`${data.accountAge.years} years, ${data.accountAge.months} months, ${data.accountAge.days} days`} />
              </GlassCard>

              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3">Media & Colors</h3>
                <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5">
                  <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Avatar</span>
                  <div className="flex items-center gap-1">
                    {data.avatarUrl ? (
                      <span className="text-sm text-green-400">Custom</span>
                    ) : (
                      <span className="text-sm text-gray-500">Default</span>
                    )}
                    <CopyBtn text={data.avatarUrl || ""} label="Copy avatar URL" />
                    {data.avatarUrl && <DownloadBtn url={data.avatarUrl} filename={`avatar_${data.id}.png`} />}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5">
                  <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Banner</span>
                  <div className="flex items-center gap-1">
                    {data.bannerUrl ? (
                      <span className="text-sm text-green-400">Custom</span>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                    <CopyBtn text={data.bannerUrl || ""} label="Copy banner URL" />
                    {data.bannerUrl && <DownloadBtn url={data.bannerUrl} filename={`banner_${data.id}.png`} />}
                  </div>
                </div>
                {data.bannerColor && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5">
                    <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Banner Color</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: data.bannerColor }} />
                      <span className="text-sm text-white font-mono">{data.bannerColor}</span>
                      <CopyBtn text={data.bannerColor} />
                    </div>
                  </div>
                )}
                {data.accentColor != null && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5">
                    <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Accent Color</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: `#${data.accentColor.toString(16).padStart(6, "0")}` }} />
                      <span className="text-sm text-white font-mono">#{data.accentColor.toString(16).padStart(6, "0")}</span>
                      <CopyBtn text={`#${data.accentColor.toString(16).padStart(6, "0")}`} />
                    </div>
                  </div>
                )}
                {data.avatarDecoration && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5">
                    <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Decoration</span>
                    <div className="flex items-center gap-2">
                      <img src={`https://cdn.discordapp.com/avatar-decoration-presets/${data.avatarDecoration}.png`} alt="" className="w-5 h-5 rounded" />
                      <CopyBtn text={data.avatarDecoration} />
                    </div>
                  </div>
                )}
                <div className="py-2 border-b border-purple-500/5 last:border-0">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Badges ({data.badges.length})</span>
                  {data.badges.length === 0 ? (
                    <p className="text-sm text-gray-500">No badges</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {data.badges.map((badge) => (
                        <span key={badge.name} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-700 text-xs text-gray-300">
                          <span>{badge.icon}</span>
                          {badge.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Snowflake Internals */}
            {data.snowflake && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3">Snowflake Internals</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Worker ID", value: String(data.snowflake.workerId), copy: String(data.snowflake.workerId) },
                    { label: "Process ID", value: String(data.snowflake.processId), copy: String(data.snowflake.processId) },
                    { label: "Sequence", value: String(data.snowflake.sequence), copy: String(data.snowflake.sequence) },
                    { label: "Timestamp (ms)", value: data.snowflake.timestampMs.toLocaleString(), copy: String(data.snowflake.timestampMs) },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/30">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-sm font-bold text-white font-mono">{s.value}</p>
                        <CopyBtn text={s.copy} />
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-purple-500/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="shrink-0">Raw ID:</span>
                    <span className="font-mono text-gray-400 break-all">{data.id}</span>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Linked Roblox Account */}
            {data.robloxAccount && (
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-white">Linked Roblox Account</h3>
                  {data.robloxAccount.linked ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-medium border border-green-500/20">Linked</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 text-[10px] font-medium border border-gray-500/20">Not Linked</span>
                  )}
                  {data.robloxAccount.linked && manualLink && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-medium border border-blue-500/20">Manual</span>
                  )}
                </div>

                {data.robloxAccount.linked && data.robloxAccount.robloxId ? (
                  <>
                    {/* Profile Header */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      {/* Roblox Avatar */}
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="w-28 h-28 rounded-xl overflow-hidden bg-dark-700 border border-purple-500/10 group relative">
                          {data.robloxAccount.avatarHeadshotHd ? (
                            <img src={data.robloxAccount.avatarHeadshotHd} alt={data.robloxAccount.username} className="w-full h-full object-cover" />
                          ) : data.robloxAccount.avatarHeadshot ? (
                            <img src={data.robloxAccount.avatarHeadshot} alt={data.robloxAccount.username} className="w-full h-full object-cover" />
                          ) : data.robloxAccount.avatarUrl ? (
                            <img src={data.robloxAccount.avatarUrl} alt={data.robloxAccount.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-600 bg-dark-600">
                              {data.robloxAccount.username?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                            {data.robloxAccount.avatarHeadshotHd && <DownloadBtn url={data.robloxAccount.avatarHeadshotHd} filename={`roblox_avatar_${data.robloxAccount.robloxId}.png`} />}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {data.robloxAccount.avatarFull && (
                            <a href={data.robloxAccount.avatarFull} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg overflow-hidden bg-dark-700 border border-purple-500/10 block hover:opacity-80 transition-opacity" title="Full body">
                              <img src={data.robloxAccount.avatarFull} alt="full body" className="w-full h-full object-cover" />
                            </a>
                          )}
                          {data.robloxAccount.avatar3d && (
                            <a href={data.robloxAccount.avatar3d} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg overflow-hidden bg-dark-700 border border-purple-500/10 block hover:opacity-80 transition-opacity" title="3D Avatar">
                              <img src={data.robloxAccount.avatar3d} alt="3D" className="w-full h-full object-cover" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Roblox Info */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-white">{data.robloxAccount.displayName || data.robloxAccount.username}</h4>
                              {data.robloxAccount.hasVerifiedBadge && (
                                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                              )}
                              {data.robloxAccount.isBanned && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium">Banned</span>
                              )}
                              {data.robloxAccount.online !== undefined && (
                                <span className={`flex items-center gap-1 text-xs ${data.robloxAccount.online === 1 || data.robloxAccount.online === 2 || data.robloxAccount.online === 3 ? "text-green-400" : "text-gray-500"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${data.robloxAccount.online === 1 || data.robloxAccount.online === 2 || data.robloxAccount.online === 3 ? "bg-current animate-pulse" : "bg-current"}`} />
                                  {data.robloxAccount.online === 1 ? "Online" : data.robloxAccount.online === 2 ? "In Game" : data.robloxAccount.online === 3 ? "In Studio" : "Offline"}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <a href={data.robloxAccount.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors text-blue-400">
                                @{data.robloxAccount.username}
                              </a>
                              <CopyBtn text={data.robloxAccount.username || ""} label="Copy username" />
                              <span className="text-gray-600">·</span>
                              <span className="font-mono text-xs">{data.robloxAccount.robloxId}</span>
                              <CopyBtn text={String(data.robloxAccount.robloxId)} label="Copy Roblox ID" />
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {manualLink && (
                              <button
                                onClick={unlinkRobloxAccount}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs text-red-400 font-medium transition-all border border-red-500/20"
                                title="Remove manual link"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                Unlink
                              </button>
                            )}
                            <a
                              href={data.robloxAccount.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              Profile
                            </a>
                          </div>
                        </div>

                        {data.robloxAccount.userStatus && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-400 italic px-3 py-1.5 rounded-lg bg-dark-700/50 border border-purple-500/5">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            <span className="truncate">"{data.robloxAccount.userStatus}"</span>
                            <CopyBtn text={data.robloxAccount.userStatus} />
                          </div>
                        )}

                        {data.robloxAccount.description && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">"{data.robloxAccount.description}"</p>
                        )}

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-purple-500/10">
                          {[
                            { label: "Friends", value: (data.robloxAccount.friendsCount ?? 0).toLocaleString(), copy: String(data.robloxAccount.friendsCount ?? 0) },
                            { label: "Followers", value: (data.robloxAccount.followersCount ?? 0).toLocaleString(), copy: String(data.robloxAccount.followersCount ?? 0) },
                            { label: "Following", value: (data.robloxAccount.followingCount ?? 0).toLocaleString(), copy: String(data.robloxAccount.followingCount ?? 0) },
                            { label: "Robux", value: `${(data.robloxAccount.robux ?? 0).toLocaleString()} R$`, copy: String(data.robloxAccount.robux ?? 0) },
                            { label: "Games", value: String(data.robloxAccount.games?.length ?? 0), copy: String(data.robloxAccount.games?.length ?? 0) },
                            { label: "Account Age", value: `${data.robloxAccount.accountAgeDays ?? 0}d`, copy: String(data.robloxAccount.accountAgeDays ?? 0) },
                          ].map((s) => (
                            <div key={s.label} className="text-center p-1.5 rounded-lg bg-dark-700/30">
                              <div className="flex items-center justify-center gap-1">
                                <p className="text-xs font-bold text-white truncate">{s.value}</p>
                                <CopyBtn text={s.copy} />
                              </div>
                              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Current Game */}
                    {data.robloxAccount.online === 2 && data.robloxAccount.currentGame && (
                      <div className="mt-4 pt-3 border-t border-purple-500/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Currently Playing</p>
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-dark-700/50">
                          {data.robloxAccount.currentGame.thumbnail ? (
                            <img src={data.robloxAccount.currentGame.thumbnail} alt="" className="w-10 h-10 rounded object-cover bg-dark-600" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-dark-600 flex items-center justify-center text-gray-600">🎮</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-medium truncate">{data.robloxAccount.currentGame.name}</p>
                            <p className="text-xs text-gray-500 truncate">{data.robloxAccount.lastLocation}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <a href={`roblox://placeId=${data.robloxAccount.currentGame.placeId}`} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-all flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                              Join
                            </a>
                            <a href={`https://www.roblox.com/games/start?placeId=${data.robloxAccount.currentGame.placeId}`} target="_blank" rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-dark-600 hover:bg-dark-500 text-white text-xs font-medium transition-all border border-purple-500/10" title="Open in browser">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          </div>
                        </div>
                        {data.robloxAccount.gameId && (
                          <div className="flex items-center justify-between gap-2 py-1.5 mt-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider shrink-0">Server ID</span>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[10px] text-gray-400 font-mono truncate text-right">{data.robloxAccount.gameId}</span>
                              <CopyBtn text={data.robloxAccount.gameId} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detail Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-purple-500/10">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Account Details</p>
                        <RobloxField label="Username" value={`@${data.robloxAccount.username}`} copy={data.robloxAccount.username || ""} />
                        <RobloxField label="Display Name" value={data.robloxAccount.displayName || ""} />
                        <RobloxField label="User ID" value={String(data.robloxAccount.robloxId)} copy={String(data.robloxAccount.robloxId || 0)} />
                        <RobloxField label="Profile URL" value="Open →" copy={data.robloxAccount.profileUrl || ""} />
                        <RobloxField label="Created" value={data.robloxAccount.created ? new Date(data.robloxAccount.created).toLocaleDateString() : "—"} copy={data.robloxAccount.created || ""} />
                        <RobloxField label="Age" value={`${data.robloxAccount.accountAgeDays ?? 0} days (${((data.robloxAccount.accountAgeDays ?? 0) / 365).toFixed(1)} years)`} />
                        <RobloxField label="Verified Badge" value={data.robloxAccount.hasVerifiedBadge ? "Yes" : "No"} />
                        <RobloxField label="Banned" value={data.robloxAccount.isBanned ? "Yes" : "No"} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Presence & Economy</p>
                        <RobloxField label="Status" value={data.robloxAccount.online === 1 ? "Online" : data.robloxAccount.online === 2 ? "In Game" : data.robloxAccount.online === 3 ? "In Studio" : "Offline"} />
                        {data.robloxAccount.online !== 2 && data.robloxAccount.lastLocation && <RobloxField label="Last Location" value={data.robloxAccount.lastLocation} />}
                        <RobloxField label="Last Online" value={data.robloxAccount.lastOnline ? new Date(data.robloxAccount.lastOnline).toLocaleString() : "—"} copy={data.robloxAccount.lastOnline || ""} />
                        <RobloxField label="Robux" value={`${(data.robloxAccount.robux ?? 0).toLocaleString()} R$`} copy={String(data.robloxAccount.robux ?? 0)} />
                        <RobloxField label="Friends" value={(data.robloxAccount.friendsCount ?? 0).toLocaleString()} copy={String(data.robloxAccount.friendsCount ?? 0)} />
                        <RobloxField label="Followers" value={(data.robloxAccount.followersCount ?? 0).toLocaleString()} copy={String(data.robloxAccount.followersCount ?? 0)} />
                        <RobloxField label="Following" value={(data.robloxAccount.followingCount ?? 0).toLocaleString()} copy={String(data.robloxAccount.followingCount ?? 0)} />
                        <RobloxField label="User Status" value={data.robloxAccount.userStatus || "—"} copy={data.robloxAccount.userStatus || ""} />
                      </div>
                    </div>

                    {/* Groups */}
                    {data.robloxAccount.groups && data.robloxAccount.groups.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-500/10">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500 uppercase tracking-wider">
                            Groups ({groupsOwnedOnly ? data.robloxAccount.groups.filter((g: any) => g.rank === 255).length : data.robloxAccount.groups.length})
                          </p>
                          <button
                            onClick={() => setGroupsOwnedOnly(!groupsOwnedOnly)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all border ${
                              groupsOwnedOnly
                                ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                                : "bg-dark-700 text-gray-500 border-purple-500/10 hover:text-gray-300"
                            }`}
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                            {groupsOwnedOnly ? "Owned" : "All"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(groupsOwnedOnly ? data.robloxAccount.groups.filter((g: any) => g.rank === 255) : data.robloxAccount.groups.slice(0, 10)).map((group: any) => (
                            <button key={group.id} onClick={() => setSelectedGroupId(group.id)}
                              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-dark-700/50 border border-purple-500/5 hover:bg-dark-700 transition-colors text-left">
                              {group.emblemUrl ? (
                                <img src={group.emblemUrl} alt="" className="w-6 h-6 rounded object-cover bg-dark-600" />
                              ) : (
                                <div className="w-6 h-6 rounded bg-dark-600 flex items-center justify-center text-[10px]">👥</div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] text-white truncate max-w-28">{group.name}</p>
                                <p className="text-[9px] text-purple-400">{group.role}</p>
                              </div>
                              {group.rank === 255 && (
                                <svg className="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                              )}
                            </button>
                          ))}
                        </div>
                        {groupsOwnedOnly && data.robloxAccount.groups.filter((g: any) => g.rank === 255).length === 0 && (
                          <p className="text-[11px] text-gray-500 py-2">No owned groups</p>
                        )}
                      </div>
                    )}

                    {/* Games */}
                    {data.robloxAccount.games && data.robloxAccount.games.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-500/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Games ({data.robloxAccount.games.length})</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {data.robloxAccount.games.slice(0, 6).map((game: any) => (
                            <a key={game.id} href={game.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5">
                              {game.image ? (
                                <img src={game.image} alt="" className="w-10 h-10 rounded object-cover bg-dark-600" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-dark-600 flex items-center justify-center text-gray-600">🎮</div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-white truncate">{game.name}</p>
                                <p className="text-[9px] text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Badges */}
                    {data.robloxAccount.badges && data.robloxAccount.badges.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-500/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Badges ({data.robloxAccount.badges.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.robloxAccount.badges.slice(0, 15).map((badge: any) => (
                            <div key={badge.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-700 text-[10px] text-gray-300">
                              {badge.imageUrl && <img src={badge.imageUrl} alt="" className="w-3.5 h-3.5 rounded" />}
                              <span className="truncate max-w-24">{badge.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collectibles */}
                    {data.robloxAccount.collectibles && data.robloxAccount.collectibles.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-500/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Collectibles ({data.robloxAccount.collectibles.length})</p>
                        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                          {data.robloxAccount.collectibles.slice(0, 10).map((item: any) => (
                            <div key={item.assetId} className="p-1.5 rounded-lg bg-dark-700/50 border border-purple-500/5 text-center">
                              {item.thumbnailUrl ? (
                                <img src={item.thumbnailUrl} alt="" className="w-full aspect-square rounded object-cover bg-dark-600" />
                              ) : (
                                <div className="w-full aspect-square rounded bg-dark-600 flex items-center justify-center text-gray-600 text-[10px]">?</div>
                              )}
                              {item.name && <p className="text-[8px] text-gray-400 mt-0.5 truncate">{item.name}</p>}
                              {item.recentAveragePrice && <p className="text-[8px] text-green-400">{item.recentAveragePrice.toLocaleString()} R$</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-3">Link a Roblox account manually by entering a username:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={linkUsername}
                        onChange={(e) => { setLinkUsername(e.target.value); setLinkError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") linkRobloxAccount(); }}
                        placeholder="Enter Roblox username..."
                        className="flex-1 px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
                        disabled={linking}
                      />
                      <button
                        onClick={linkRobloxAccount}
                        disabled={linking || !linkUsername.trim()}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all"
                      >
                        {linking ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Linking
                          </span>
                        ) : (
                          "Link"
                        )}
                      </button>
                    </div>
                    {linkError && (
                      <p className="text-xs text-red-400 mt-2">{linkError}</p>
                    )}
                  </div>
                )}
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {selectedGroupId && (
        <GroupDetailModal groupId={selectedGroupId} onClose={() => setSelectedGroupId(null)} />
      )}
    </div>
  );
}
