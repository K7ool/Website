"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";

interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  globalName: string;
  avatarUrl: string;
  bannerUrl: string;
  bannerColor: string | null;
  badges: string[];
  createdAt: string | null;
  accountAgeDays: number;
  profileUrl: string;
  cdnAvatar: string;
  cdnBanner: string | null;
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

const BADGE_LABELS: Record<string, string> = {
  DISCORD_EMPLOYEE: "Discord Employee",
  DISCORD_PARTNER: "Partner",
  HYPESQUAD_EVENTS: "HypeSquad Events",
  BUGHUNTER_LEVEL_1: "Bug Hunter L1",
  BUGHUNTER_LEVEL_2: "Bug Hunter L2",
  HOUSE_BRAVERY: "HypeSquad Bravery",
  HOUSE_BRILLIANCE: "HypeSquad Brilliance",
  HOUSE_BALANCE: "HypeSquad Balance",
  EARLY_SUPPORTER: "Early Supporter",
  EARLY_VERIFIED_BOT_DEVELOPER: "Verified Bot Dev",
  CERTIFIED_MODERATOR: "Certified Mod",
  ACTIVE_DEVELOPER: "Active Dev",
  VERIFIED_BOT: "Verified Bot",
};

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
                <div className="flex flex-col items-center gap-2 shrink-0 -mt-16 sm:-mt-12">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-dark-700 border-4 border-dark-900 group relative">
                    {data.avatarUrl ? (
                      <img src={data.avatarUrl} alt={data.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600 bg-indigo-500/20">
                        {data.username?.[0]?.toUpperCase() || data.id?.[0] || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <CopyBtn text={data.avatarUrl} label="Copy avatar URL" />
                    </div>
                  </div>
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
                        <span key={badge} className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-medium border border-purple-500/20">
                          {BADGE_LABELS[badge] || badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-purple-500/10">
                {[
                  { label: "Account Age", value: `${data.accountAgeDays}d`, copy: String(data.accountAgeDays) },
                  { label: "Years", value: `${(data.accountAgeDays / 365).toFixed(1)}y`, copy: String((data.accountAgeDays / 365).toFixed(1)) },
                  { label: "Badges", value: String(data.badges.length), copy: String(data.badges.length) },
                  { label: "Banner", value: data.bannerUrl ? "Yes" : "No", copy: data.bannerUrl || "No" },
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
                <Field label="Discriminator" value={`#${data.discriminator}`} copy={data.discriminator} />
                <Field label="Profile URL" value="Open →" copy={data.profileUrl} />
                <Field label="Created" value={data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"} copy={data.createdAt || ""} />
                <Field label="Age" value={`${data.accountAgeDays} days (${(data.accountAgeDays / 365).toFixed(1)} years)`} />
              </GlassCard>

              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3">Media & Badges</h3>
                <Field label="Avatar URL" value={data.avatarUrl ? "Available" : "Default"} copy={data.avatarUrl || data.cdnAvatar} />
                <Field label="Banner URL" value={data.bannerUrl ? "Available" : "None"} copy={data.bannerUrl || ""} />
                {data.bannerColor && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-purple-500/5 last:border-0">
                    <span className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Banner Color</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: data.bannerColor }} />
                      <span className="text-sm text-white font-mono">{data.bannerColor}</span>
                      <CopyBtn text={data.bannerColor} />
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
                        <span key={badge} className="px-2 py-1 rounded-lg bg-dark-700 text-xs text-gray-300">
                          {BADGE_LABELS[badge] || badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
