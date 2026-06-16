"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GameCreator {
  type: string;
  id: number;
  name: string;
  isRGroup: boolean;
  hasVerifiedBadge: boolean;
}

interface GamePlace {
  id: number;
  name: string;
  description: string;
  maxPlayers: number;
  order: number;
  isStart: boolean;
  rank: number;
}

interface GamePass {
  id: number;
  name: string;
  displayName: string;
  description: string;
  price: number;
  isForSale: boolean;
  isIconFinal: boolean;
  thumbnailUrl: string;
}

interface GameSocialLink {
  type: string;
  url: string;
  title: string;
}

interface GameDetailData {
  id: number;
  name: string;
  description: string;
  creator: GameCreator | null;
  iconUrl: string;
  thumbSm: string;
  thumbMd: string;
  thumbLg: string;
  playing: number;
  visits: number;
  maxPlayers: number;
  genres: string[];
  genreList: string[];
  totalUpVotes: number;
  totalDownVotes: number;
  commentCount: number;
  favoritedCount: number;
  likedCount: number;
  universeId: number;
  rootPlaceId: number;
  created: string;
  updated: string;
  studioURL: string;
  websiteURL: string;
  socialLinks: GameSocialLink[];
  places: GamePlace[];
  gamePasses: GamePass[];
}

function CopyBtn({ text, label }: { text: string | number; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button onClick={copy} title={label || `Copy`} className="shrink-0 p-1 rounded hover:bg-white/10 transition-all text-gray-500 hover:text-purple-400">
      {copied ? (
        <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      )}
    </button>
  );
}

function Field({ label, value, copy }: { label: string; value: string | number; copy?: string | number }) {
  const txt = copy !== undefined ? String(copy) : String(value);
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

type Tab = "info" | "places" | "passes";

const GENRE_COLORS: Record<string, string> = {
  Building: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  Fighting: "bg-red-500/15 text-red-300 border-red-500/20",
  FPS: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  Horror: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  Adventure: "bg-green-500/15 text-green-300 border-green-500/20",
  RPG: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  SciFi: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  Comedy: "bg-pink-500/15 text-pink-300 border-pink-500/20",
  "Town and City": "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  "Obby": "bg-teal-500/15 text-teal-300 border-teal-500/20",
  Racing: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  Sports: "bg-lime-500/15 text-lime-300 border-lime-500/20",
  Simulation: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  Experience: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20",
};

const SOCIAL_ICONS: Record<string, string> = {
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  twitter: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  discord: "M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z",
  twitch: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z",
  twitch_tv: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z",
  roblox: "M5.166 3.178l4.782-2.753a1.5 1.5 0 011.5 0l4.782 2.753a1.5 1.5 0 01.75 1.3v5.506a1.5 1.5 0 01-.75 1.3l-4.782 2.753a1.5 1.5 0 01-1.5 0L5.166 13.99a1.5 1.5 0 01-.75-1.3V7.183a1.5 1.5 0 01.75-1.3z",
};

export default function GameDetailModal({ universeId, onClose }: { universeId: number; onClose: () => void }) {
  const [data, setData] = useState<GameDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("info");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/roblox/game?universeId=${universeId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load game");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [universeId]);

  const totalVotes = (data?.totalUpVotes || 0) + (data?.totalDownVotes || 0);
  const approvalRating = totalVotes > 0 ? Math.round(((data?.totalUpVotes || 0) / totalVotes) * 100) : 0;

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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-dark-800 border border-purple-500/10 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-purple-500/10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {loading ? (
                <div className="w-14 h-14 rounded-xl bg-dark-700 animate-pulse" />
              ) : data?.thumbSm ? (
                <img src={data.thumbSm} alt="" className="w-14 h-14 rounded-xl object-cover bg-dark-700" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-dark-700 flex items-center justify-center text-xl">🎮</div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{loading ? "Loading..." : data?.name || "Unknown"}</h2>
                <p className="text-xs text-gray-500">Universe ID: {universeId}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {data && !loading && (
              <>
                {/* Tabs */}
                <div className="flex gap-1">
                  {([["info", "Info"], ["places", `Places (${data.places.length})`], ["passes", `Passes (${data.gamePasses.length})`]] as [Tab, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === key
                          ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                          : "text-gray-400 hover:text-gray-200 border border-transparent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Tab: Info */}
                {tab === "info" && (
                  <div className="space-y-4">
                    {data.description && (
                      <p className="text-sm text-gray-400 leading-relaxed">{data.description}</p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Playing", value: data.playing.toLocaleString(), copy: String(data.playing), color: "text-green-400" },
                        { label: "Visits", value: data.visits.toLocaleString(), copy: String(data.visits), color: "text-white" },
                        { label: "Favorites", value: data.favoritedCount.toLocaleString(), copy: String(data.favoritedCount), color: "text-yellow-400" },
                        { label: "Approval", value: `${approvalRating}%`, copy: `${approvalRating}%`, color: "text-purple-400" },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/30">
                          <div className="flex items-center justify-center gap-1">
                            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                            <CopyBtn text={s.copy} />
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Genres */}
                    {data.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {data.genres.map((genre) => (
                          <span key={genre} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${GENRE_COLORS[genre] || "bg-dark-700 text-gray-300 border-purple-500/10"}`}>
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Creator */}
                    {data.creator && (
                      <div className="p-3 rounded-lg bg-dark-700/30 border border-purple-500/5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Creator</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-sm text-gray-400 overflow-hidden">
                            {data.creator.type === "User" ? (
                              <img
                                src={`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${data.creator.id}&size=150x150&format=Png&isCircular=true`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <span>👥</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              {data.creator.type === "User" ? (
                                <a
                                  href={`https://www.roblox.com/users/${data.creator.id}/profile`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-white font-medium hover:text-purple-400 transition-colors truncate"
                                >
                                  {data.creator.name}
                                </a>
                              ) : (
                                <a
                                  href={`https://www.roblox.com/groups/${data.creator.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-white font-medium hover:text-purple-400 transition-colors truncate"
                                >
                                  {data.creator.name}
                                </a>
                              )}
                              {data.creator.hasVerifiedBadge && (
                                <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{data.creator.type} · ID: {data.creator.id}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div>
                      <Field label="Universe ID" value={data.universeId} copy={String(data.universeId)} />
                      <Field label="Root Place ID" value={data.rootPlaceId} copy={String(data.rootPlaceId)} />
                      <Field label="Max Players" value={data.maxPlayers} copy={String(data.maxPlayers)} />
                      <Field label="Up Votes" value={data.totalUpVotes.toLocaleString()} copy={String(data.totalUpVotes)} />
                      <Field label="Down Votes" value={data.totalDownVotes.toLocaleString()} copy={String(data.totalDownVotes)} />
                      <Field label="Comments" value={data.commentCount.toLocaleString()} copy={String(data.commentCount)} />
                      <Field label="Created" value={data.created ? new Date(data.created).toLocaleDateString() : "—"} copy={data.created} />
                      <Field label="Updated" value={data.updated ? new Date(data.updated).toLocaleDateString() : "—"} copy={data.updated} />
                    </div>

                    {/* Social Links */}
                    {data.socialLinks.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Social Links</p>
                        <div className="flex flex-wrap gap-2">
                          {data.socialLinks.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/50 border border-purple-500/5 hover:bg-dark-700 transition-colors text-xs text-gray-300"
                            >
                              {SOCIAL_ICONS[link.type] ? (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d={SOCIAL_ICONS[link.type]} /></svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              )}
                              {link.title || link.type}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links */}
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href={data.websiteURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Play Game
                      </a>
                      {data.studioURL && (
                        <a
                          href={data.studioURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs text-gray-300 font-medium transition-all border border-purple-500/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          Studio
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Places */}
                {tab === "places" && (
                  <div className="space-y-2">
                    {data.places.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No places found</p>
                    ) : (
                      data.places.map((place) => (
                        <div key={place.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-dark-700/30 border border-purple-500/5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white font-medium truncate">{place.name}</p>
                              {place.isStart && (
                                <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-medium">Start</span>
                              )}
                            </div>
                            {place.description && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">{place.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <p className="text-xs text-white font-mono">{place.maxPlayers}</p>
                              <p className="text-[9px] text-gray-500">Max</p>
                            </div>
                            <div className="w-10 text-right">
                              <p className="text-xs text-purple-400 font-mono">#{place.rank}</p>
                              <p className="text-[9px] text-gray-500">Rank</p>
                            </div>
                            <CopyBtn text={place.id} label="Copy place ID" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Passes */}
                {tab === "passes" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.gamePasses.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 col-span-full">No game passes found</p>
                    ) : (
                      data.gamePasses.map((pass) => (
                        <div key={pass.id} className="p-3 rounded-lg bg-dark-700/30 border border-purple-500/5 text-center">
                          <div className="relative mx-auto w-16 h-16 mb-2">
                            {pass.thumbnailUrl ? (
                              <img src={pass.thumbnailUrl} alt="" className="w-full h-full rounded-lg object-cover bg-dark-600" />
                            ) : (
                              <div className="w-full h-full rounded-lg bg-dark-600 flex items-center justify-center text-gray-600">🎫</div>
                            )}
                          </div>
                          <p className="text-xs text-white font-medium truncate">{pass.displayName || pass.name}</p>
                          {pass.description && (
                            <p className="text-[9px] text-gray-500 truncate mt-0.5">{pass.description}</p>
                          )}
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {pass.isForSale ? (
                              <span className="text-xs text-green-400 font-medium">
                                {pass.price === 0 ? "Free" : `${pass.price} R$`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">Offsale</span>
                            )}
                            <CopyBtn text={pass.id} label="Copy pass ID" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
