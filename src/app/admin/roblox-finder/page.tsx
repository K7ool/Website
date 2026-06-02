"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";

interface RobloxUserData {
  userId: number;
  username: string;
  displayName: string;
  description: string;
  created: string;
  profileUrl: string;
  avatarHeadshot: string;
  avatarFull: string;
  isBanned: boolean;
  hasVerifiedBadge: boolean;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  games: any[];
  groups: any[];
  badges: any[];
  collectibles: any[];
}

type Tab = "overview" | "games" | "groups" | "badges" | "inventory";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "games", label: "Games" },
  { key: "groups", label: "Groups" },
  { key: "badges", label: "Badges" },
  { key: "inventory", label: "Collectibles" },
];

export default function RobloxFinderPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RobloxUserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/roblox/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
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
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-dark-700 border border-purple-500/10">
                    {data.avatarHeadshot ? (
                      <img src={data.avatarHeadshot} alt={data.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
                        {data.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  {data.avatarFull && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-dark-700 border border-purple-500/10">
                      <img src={data.avatarFull} alt="full body" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left">
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
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <a href={data.profileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors">
                      @{data.username}
                    </a>
                    <span className="mx-2 text-gray-600">·</span>
                    ID: {data.userId}
                  </p>
                  {data.description && (
                    <p className="text-sm text-gray-400 mt-3 line-clamp-3 max-w-lg mx-auto sm:mx-0">{data.description}</p>
                  )}
                  {data.created && (
                    <p className="text-xs text-gray-500 mt-2">Joined {new Date(data.created).toLocaleDateString()}</p>
                  )}

                  <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{data.friendsCount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Friends</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{data.followersCount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{data.followingCount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Following</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{data.games.length}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Games</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {TABS.map((t) => (
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
                  {t.key === "games" && data.games.length > 0 && (
                    <span className="ml-1.5 text-xs text-gray-500">({data.games.length})</span>
                  )}
                  {t.key === "groups" && data.groups.length > 0 && (
                    <span className="ml-1.5 text-xs text-gray-500">({data.groups.length})</span>
                  )}
                  {t.key === "badges" && data.badges.length > 0 && (
                    <span className="ml-1.5 text-xs text-gray-500">({data.badges.length})</span>
                  )}
                  {t.key === "inventory" && data.collectibles.length > 0 && (
                    <span className="ml-1.5 text-xs text-gray-500">({data.collectibles.length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.games.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-3">Recent Games</h3>
                    <div className="space-y-2">
                      {data.games.slice(0, 5).map((game: any) => (
                        <a
                          key={game.id || game.universeId}
                          href={`https://www.roblox.com/games/${game.id || game.universeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          {game.thumbnailUrl?.[0]?.imageUrl ? (
                            <img src={game.thumbnailUrl[0].imageUrl} alt="" className="w-10 h-10 rounded object-cover bg-dark-700" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center text-gray-600">🎮</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{game.name}</p>
                            <p className="text-[10px] text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                          </div>
                        </a>
                      ))}
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
                    <h3 className="text-sm font-semibold text-white mb-3">Groups</h3>
                    <div className="space-y-2">
                      {data.groups.slice(0, 5).map((group: any) => (
                        <a
                          key={group.id}
                          href={`https://www.roblox.com/groups/${group.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                        >
                          {group.emblemUrl ? (
                            <img src={group.emblemUrl} alt="" className="w-10 h-10 rounded object-cover bg-dark-700" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center text-gray-600">👥</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{group.name}</p>
                            <p className="text-[10px] text-gray-500">{group.role} (Rank {group.rank})</p>
                          </div>
                        </a>
                      ))}
                    </div>
                    {data.groups.length > 5 && (
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
                      {data.badges.slice(0, 10).map((badge: any) => (
                        <div key={badge.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-dark-700 text-xs text-gray-300">
                          {badge.iconImageUrl && (
                            <img src={badge.iconImageUrl} alt="" className="w-4 h-4 rounded" />
                          )}
                          <span className="truncate max-w-28">{badge.name}</span>
                        </div>
                      ))}
                    </div>
                    {data.badges.length > 10 && (
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
                        <div key={item.itemId || item.assetId} className="flex flex-col items-center gap-1 p-1 rounded-lg bg-dark-700">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover" />
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
                <h3 className="text-sm font-semibold text-white mb-4">Games ({data.games.length})</h3>
                {data.games.length === 0 ? (
                  <p className="text-sm text-gray-500">No public games found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.games.map((game: any) => (
                      <a
                        key={game.id || game.universeId}
                        href={`https://www.roblox.com/games/${game.id || game.universeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5"
                      >
                        {game.thumbnailUrl?.[0]?.imageUrl && (
                          <img src={game.thumbnailUrl[0].imageUrl} alt="" className="w-full aspect-video rounded object-cover bg-dark-600 mb-2" />
                        )}
                        <p className="text-sm text-white font-medium truncate">{game.name}</p>
                        <p className="text-xs text-gray-500">{game.visits?.toLocaleString() || 0} visits</p>
                        {game.playing && <p className="text-xs text-green-400">{game.playing} playing now</p>}
                      </a>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {tab === "groups" && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4">Groups ({data.groups.length})</h3>
                {data.groups.length === 0 ? (
                  <p className="text-sm text-gray-500">No groups found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.groups.map((group: any) => (
                      <a
                        key={group.id}
                        href={`https://www.roblox.com/groups/${group.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 transition-colors border border-purple-500/5"
                      >
                        {group.emblemUrl ? (
                          <img src={group.emblemUrl} alt="" className="w-12 h-12 rounded object-cover bg-dark-600" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-dark-600 flex items-center justify-center text-lg">👥</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">{group.name}</p>
                          <p className="text-xs text-purple-400">{group.role}</p>
                          <p className="text-[10px] text-gray-600">Rank {group.rank}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {tab === "badges" && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4">Badges ({data.badges.length})</h3>
                {data.badges.length === 0 ? (
                  <p className="text-sm text-gray-500">No badges found.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.badges.map((badge: any) => (
                      <div
                        key={badge.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700/50 border border-purple-500/5"
                      >
                        {badge.iconImageUrl && (
                          <img src={badge.iconImageUrl} alt="" className="w-6 h-6 rounded" />
                        )}
                        <div>
                          <p className="text-sm text-white">{badge.name}</p>
                          {badge.description && (
                            <p className="text-[10px] text-gray-500 line-clamp-1 max-w-40">{badge.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {tab === "inventory" && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4">Collectibles ({data.collectibles.length})</h3>
                {data.collectibles.length === 0 ? (
                  <p className="text-sm text-gray-500">No collectibles found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {data.collectibles.map((item: any) => (
                      <div
                        key={item.itemId || item.assetId}
                        className="p-2 rounded-lg bg-dark-700/50 border border-purple-500/5 text-center"
                      >
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" className="w-full aspect-square rounded object-cover bg-dark-600" />
                        ) : (
                          <div className="w-full aspect-square rounded bg-dark-600 flex items-center justify-center text-gray-600 text-xs">No img</div>
                        )}
                        {item.name && <p className="text-[10px] text-gray-400 mt-1 truncate">{item.name}</p>}
                        {item.recentAveragePrice && (
                          <p className="text-[10px] text-green-400">{item.recentAveragePrice} R$</p>
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
    </div>
  );
}
