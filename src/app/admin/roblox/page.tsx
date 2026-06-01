"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { profileService } from "@/lib/firestore";

export default function AdminRobloxPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = profileService.subscribe((items) => {
      setProfiles(items.filter((p: any) => p.robloxUsername || p.robloxVerified));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (p.robloxUsername?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q));
  });

  const verified = profiles.filter((p: any) => p.robloxVerified).length;
  const unverified = profiles.filter((p: any) => p.robloxUsername && !p.robloxVerified).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-2xl font-bold text-white mb-6">Roblox Verifications</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <GlassCard><div className="text-2xl font-bold text-white">{profiles.length}</div><div className="text-xs text-gray-400">Total Linked</div></GlassCard>
        <GlassCard><div className="text-2xl font-bold text-green-400">{verified}</div><div className="text-xs text-gray-400">Verified</div></GlassCard>
        <GlassCard><div className="text-2xl font-bold text-yellow-400">{unverified}</div><div className="text-xs text-gray-400">Pending</div></GlassCard>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Roblox username, site username, or email..."
          className="w-full max-w-md px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
      </div>

      <GlassCard>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No Roblox accounts linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">User</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Roblox Username</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Roblox Avatar</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-purple-500/5 hover:bg-white/5">
                    <td className="py-3 px-3">
                      <div>
                        <div className="text-white font-medium">{p.username || p.email}</div>
                        <div className="text-xs text-gray-500">{p.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-300">{p.robloxUsername || "—"}</td>
                    <td className="py-3 px-3">
                      {p.robloxAvatarUrl ? (
                        <img src={p.robloxAvatarUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.robloxVerified ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {p.robloxVerified ? "✓ Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1.5">
                        {p.robloxProfileUrl && (
                          <a href={p.robloxProfileUrl} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all">
                            Profile
                          </a>
                        )}
                        {!p.robloxVerified && p.robloxUsername && (
                          <button onClick={async () => {
                            try {
                              const { checkRobloxBio, generateVerificationCode } = await import("@/lib/roblox");
                              const code = p.verificationCode || generateVerificationCode();
                              const found = await checkRobloxBio(p.robloxUsername, code);
                              if (found) {
                                const { fetchRobloxProfile } = await import("@/lib/roblox");
                                const profile = await fetchRobloxProfile(p.robloxUsername);
                                await profileService.upsert(p.id, {
                                  robloxVerified: true,
                                  robloxUserId: profile?.userId || 0,
                                  robloxProfileUrl: profile?.profileUrl || "",
                                  robloxAvatarUrl: profile?.avatarUrl || "",
                                  verifiedAt: new Date().toISOString(),
                                });
                              } else {
                                alert("Verification code not found in Roblox bio. User needs to add the code.");
                              }
                            } catch (err) {
                              console.error("Manual verify failed:", err);
                            }
                          }}
                            className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">
                            Force Verify
                          </button>
                        )}
                        {p.robloxVerified && (
                          <button onClick={async () => {
                            await profileService.upsert(p.id, { robloxVerified: false });
                          }}
                            className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">
                            Unverify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
