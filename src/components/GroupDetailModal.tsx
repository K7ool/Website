"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UserDetailModal from "./UserDetailModal";

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

interface GroupOwner {
  userId: number;
  username: string;
  displayName: string;
  hasVerifiedBadge: boolean;
}

interface GroupRole {
  id: number;
  name: string;
  rank: number;
  memberCount: number;
  description: string;
}

interface GroupMember {
  userId: number;
  username: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  role: string;
  rank: number;
  joinedAt: string;
}

interface GroupDetailData {
  id: number;
  name: string;
  description: string;
  owner: GroupOwner | null;
  memberCount: number;
  isBuildersClubOnly: boolean;
  publicEntryAllowed: boolean;
  hasVerifiedBadge: boolean;
  isLocked: boolean;
  emblemUrl: string;
  thumbnailUrl: string;
  roles: GroupRole[];
  members: GroupMember[];
  totalMembers: number;
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

type Tab = "info" | "roles" | "members";

export default function GroupDetailModal({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const [data, setData] = useState<GroupDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("info");
  const [membersPage, setMembersPage] = useState(1);
  const MEMBERS_PER_PAGE = 20;
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/roblox/group?id=${groupId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load group");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [groupId]);

  const resetPage = (newTab: Tab) => {
    setTab(newTab);
    if (newTab === "members") setMembersPage(1);
  };

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
                <div className="w-12 h-12 rounded-xl bg-dark-700 animate-pulse" />
              ) : data?.emblemUrl ? (
                <img src={data.emblemUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-dark-700" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-dark-700 flex items-center justify-center text-xl">👥</div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{loading ? "Loading..." : data?.name || "Unknown"}</h2>
                <p className="text-xs text-gray-500">Group ID: {groupId}</p>
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
                  {([["info", "Info"], ["roles", `Roles (${data.roles.length})`], ["members", `Members (${data.totalMembers})`]] as [Tab, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => resetPage(key)}
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
                        { label: "Members", value: data.memberCount.toLocaleString(), copy: String(data.memberCount) },
                        { label: "Roles", value: String(data.roles.length), copy: String(data.roles.length) },
                        { label: "Entry", value: data.publicEntryAllowed ? "Open" : "Manual", copy: data.publicEntryAllowed ? "Open" : "Manual" },
                        { label: "Locked", value: data.isLocked ? "Yes" : "No", copy: data.isLocked ? "Yes" : "No" },
                      ].map((s) => (
                        <div key={s.label} className="text-center p-2 rounded-lg bg-dark-700/30">
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm font-bold text-white">{s.value}</p>
                            <CopyBtn text={s.copy} />
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Owner */}
                    {data.owner && (
                      <div className="p-3 rounded-lg bg-dark-700/30 border border-purple-500/5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Owner</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-sm text-gray-400 overflow-hidden">
                            <img
                              src={`/api/roblox/avatar?userId=${data.owner.userId}&circle=1`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <a
                                href={`https://www.roblox.com/users/${data.owner.userId}/profile`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-white font-medium hover:text-purple-400 transition-colors truncate"
                              >
                                {data.owner.displayName}
                              </a>
                              {data.owner.hasVerifiedBadge && (
                                <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              @{data.owner.username}
                              <CopyBtn text={data.owner.username} />
                              <span className="text-gray-600">·</span>
                              <span className="font-mono">{data.owner.userId}</span>
                              <CopyBtn text={String(data.owner.userId)} />
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div>
                      <Field label="Group ID" value={data.id} copy={String(data.id)} />
                      <Field label="Name" value={data.name} copy={data.name} />
                      <Field label="Description" value={data.description || "—"} copy={data.description || ""} />
                      <Field label="Members" value={data.memberCount.toLocaleString()} copy={String(data.memberCount)} />
                      <Field label="Builders Club Only" value={data.isBuildersClubOnly ? "Yes" : "No"} />
                      <Field label="Public Entry" value={data.publicEntryAllowed ? "Yes" : "No"} />
                      <Field label="Verified" value={data.hasVerifiedBadge ? "Yes" : "No"} />
                      <Field label="Locked" value={data.isLocked ? "Yes" : "No"} />
                      <Field label="URL" value="Open →" copy={`https://www.roblox.com/groups/${data.id}`} />
                    </div>
                  </div>
                )}

                {/* Tab: Roles */}
                {tab === "roles" && (
                  <div className="space-y-2">
                    {data.roles.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No roles found</p>
                    ) : (
                      data.roles.map((role) => (
                        <div key={role.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-dark-700/30 border border-purple-500/5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white font-medium truncate">{role.name}</p>
                              <CopyBtn text={role.name} label="Copy role name" />
                            </div>
                            {role.description && (
                              <p className="text-[11px] text-gray-500 truncate mt-0.5">{role.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-xs text-white font-mono">{role.memberCount.toLocaleString()}</p>
                              <p className="text-[9px] text-gray-500">members</p>
                            </div>
                            <div className="text-right w-12">
                              <p className="text-xs text-purple-400 font-mono">{role.rank}</p>
                              <p className="text-[9px] text-gray-500">rank</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Members */}
                {tab === "members" && (
                  <div className="space-y-1.5">
                    {data.members.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No members loaded</p>
                    ) : (
                      <>
                        {data.members.slice(0, membersPage * MEMBERS_PER_PAGE).map((member) => (
                          <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                            <div className="w-9 h-9 rounded-full bg-dark-600 overflow-hidden shrink-0 border border-purple-500/10">
                              <img
                                src={`/api/roblox/avatar?userId=${member.userId}&circle=1`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=6366f1&color=fff&size=150`; }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <a
                                  href={`https://www.roblox.com/users/${member.userId}/profile`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-white hover:text-purple-400 transition-colors truncate"
                                >
                                  {member.displayName}
                                </a>
                                {member.hasVerifiedBadge && (
                                  <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">@{member.username}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-medium">{member.role}</span>
                              <span className="text-[10px] text-gray-600 font-mono w-8 text-right">#{member.rank}</span>
                                <button
                                  onClick={() => setSelectedUserId(member.userId)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 transition-all"
                                  title="View user profile"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </button>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-3 border-t border-purple-500/10">
                          <p className="text-xs text-gray-500">
                            Showing {Math.min(membersPage * MEMBERS_PER_PAGE, data.members.length)} of {data.members.length.toLocaleString()} loaded
                            {data.totalMembers > data.members.length && (
                              <span className="text-gray-600"> ({data.totalMembers.toLocaleString()} total)</span>
                            )}
                          </p>
                          {membersPage * MEMBERS_PER_PAGE < data.members.length && (
                            <button
                              onClick={() => setMembersPage((p) => p + 1)}
                              className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium transition-all border border-purple-500/20"
                            >
                              Load More
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </AnimatePresence>
  );
}
