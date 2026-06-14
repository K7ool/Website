"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";

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
  robloxId?: number;
  username?: string;
  displayName?: string;
  description?: string;
  avatarUrl?: string;
  created?: string | null;
  accountAgeDays?: number;
  accountAge?: DiscordAge;
  profileUrl?: string;
  isBanned?: boolean;
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

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/discord/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: query.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to find user");
      } else {
        setData(json.data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
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
            onClick={search}
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
                </div>

                {data.robloxAccount.linked && data.robloxAccount.robloxId ? (
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                    {/* Roblox Avatar */}
                    <div className="shrink-0 relative group">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-dark-700 border border-purple-500/10">
                        {data.robloxAccount.avatarUrl ? (
                          <img src={data.robloxAccount.avatarUrl} alt={data.robloxAccount.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600 bg-dark-600">
                            {data.robloxAccount.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                        {data.robloxAccount.avatarUrl && <DownloadBtn url={data.robloxAccount.avatarUrl} filename={`roblox_avatar_${data.robloxAccount.robloxId}.png`} />}
                      </div>
                    </div>

                    {/* Roblox Info */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-bold text-white">{data.robloxAccount.displayName || data.robloxAccount.username}</h4>
                            {data.robloxAccount.isBanned && (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-medium">Banned</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <span className="text-blue-400">@{data.robloxAccount.username}</span>
                            <span className="text-gray-600">·</span>
                            <span className="font-mono text-xs">{data.robloxAccount.robloxId}</span>
                            <CopyBtn text={String(data.robloxAccount.robloxId)} label="Copy Roblox ID" />
                          </p>
                        </div>
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

                      {data.robloxAccount.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 italic">"{data.robloxAccount.description}"</p>
                      )}

                      {/* Roblox Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-500/10">
                        {[
                          { label: "User ID", value: String(data.robloxAccount.robloxId), copy: String(data.robloxAccount.robloxId) },
                          { label: "Account Age", value: data.robloxAccount.accountAge ? `${data.robloxAccount.accountAge.years}y ${data.robloxAccount.accountAge.months}m` : "—", copy: String(data.robloxAccount.accountAgeDays || 0) },
                          { label: "Created", value: data.robloxAccount.created ? new Date(data.robloxAccount.created).toLocaleDateString() : "—", copy: data.robloxAccount.created || "" },
                        ].map((s) => (
                          <div key={s.label} className="text-center p-1.5 rounded-lg bg-dark-700/30">
                            <div className="flex items-center justify-center gap-1">
                              <p className="text-xs font-bold text-white font-mono truncate">{s.value}</p>
                              <CopyBtn text={s.copy} />
                            </div>
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-4 text-gray-500">
                    <svg className="w-8 h-8 shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <div>
                      <p className="text-sm text-gray-400">No Roblox account linked</p>
                      <p className="text-xs text-gray-600">This user hasn't verified with Bloxlink in your server</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
