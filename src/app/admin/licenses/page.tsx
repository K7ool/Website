"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { orderBy, where } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import LicenseHealthBadge from "@/components/LicenseHealthBadge";
import { licenseService } from "@/lib/firestore";

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring_soon" | "expired" | "revoked">("all");
  const [generating, setGenerating] = useState<any | null>(null);
  const [genForm, setGenForm] = useState({ userId: "", productId: "", productName: "", durationMonths: 12, maxDownloads: 0, universeId: "", creatorId: "" });
  const [genLoading, setGenLoading] = useState(false);
  const [extending, setExtending] = useState<any | null>(null);
  const [extendMonths, setExtendMonths] = useState(6);
  const [extendLoading, setExtendLoading] = useState(false);
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    const unsub = licenseService.subscribe((items) => {
      setLicenses(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, []);

  const filtered = licenses.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.key?.toLowerCase().includes(q) || l.productName?.toLowerCase().includes(q) || l.userId?.toLowerCase().includes(q);
    const expired = l.expiresAt && new Date(l.expiresAt) < new Date() && l.status === "active";
    const daysLeft = l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86400000) : null;
    const expiringSoon = l.status === "active" && !expired && daysLeft !== null && daysLeft <= 7;
    if (filter === "all") return matchSearch;
    if (filter === "active") return matchSearch && l.status === "active" && !expired;
    if (filter === "expiring_soon") return matchSearch && expiringSoon;
    if (filter === "expired") return matchSearch && expired;
    if (filter === "revoked") return matchSearch && l.status === "revoked";
    return matchSearch;
  });

  const handleGenerate = async () => {
    if (!genForm.userId.trim() || !genForm.productName.trim()) return;
    setGenLoading(true);
    setNewKey("");
    try {
      const id = await licenseService.create({
        ...genForm,
        universeId: genForm.universeId ? parseInt(genForm.universeId) || undefined : undefined,
        creatorId: genForm.creatorId ? parseInt(genForm.creatorId) || undefined : undefined,
        generatedBy: "admin",
      });
      const lic = await licenseService.getById(id);
      setNewKey(lic?.key || "");
      setGenForm({ userId: "", productId: "", productName: "", durationMonths: 12, maxDownloads: 0, universeId: "", creatorId: "" });
    } catch (err) {
      console.error("Generate failed:", err);
    }
    setGenLoading(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this license? User will lose access.")) return;
    await licenseService.revoke(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this license permanently?")) return;
    await (await import("@/lib/firestore")).licenseService.delete?.(id);
  };

  const handleExtend = async () => {
    if (!extending) return;
    setExtendLoading(true);
    try {
      await licenseService.extend(extending.id, extendMonths);
      setExtending(null);
    } catch (err) {
      console.error("Extend failed:", err);
    }
    setExtendLoading(false);
  };

  const handleResetBinding = async (id: string) => {
    if (!confirm("Reset universe binding? The license can be activated from a different game.")) return;
    await licenseService.resetBinding(id);
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm("Regenerate license key? The old key will stop working.")) return;
    const newKey = await licenseService.regenerate(id);
    alert(`New key: ${newKey}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">License Analytics</h2>
        <button
          onClick={() => { setGenerating({}); setNewKey(""); }}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all"
        >
          + Generate License
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by key, product, or user..."
          className="flex-1 px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "active", "expiring_soon", "expired", "revoked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-purple-600/20 text-purple-400 border border-purple-500/20" : "bg-dark-600 text-gray-400 hover:text-white"
              }`}
            >
              {f === "expiring_soon" ? "Expiring Soon" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No licenses found.</p></GlassCard>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">License Key</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Product</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">User</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Health</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Universe</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Creator</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Activations</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Last Verification</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lic) => {
                  return (
                    <tr key={lic.id} className="border-b border-purple-500/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <code className="text-purple-300 bg-dark-600 px-2 py-0.5 rounded text-xs font-mono block max-w-[120px] truncate" title={lic.key}>{lic.key}</code>
                      </td>
                      <td className="py-3 px-3 text-gray-300 text-xs max-w-[140px] truncate" title={lic.productName}>{lic.productName || "—"}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs font-mono" title={lic.userId}>{lic.userId?.slice(0, 12)}...</td>
                      <td className="py-3 px-3"><LicenseHealthBadge lic={lic} /></td>
                      <td className="py-3 px-3 text-gray-400 text-xs font-mono">{lic.universeId || "—"}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs font-mono">{lic.creatorId || "—"}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{lic.activationCount || 0}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{lic.lastVerification ? new Date(lic.lastVerification).toLocaleString() : "—"}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(lic.status === "active" || (!lic.expiresAt || new Date(lic.expiresAt) >= new Date())) && (
                            <button onClick={() => handleRevoke(lic.id)}
                              className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs hover:bg-yellow-500/20 transition-all">Revoke</button>
                          )}
                          <button onClick={() => { setExtending(lic); setExtendMonths(6); }}
                            className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Extend</button>
                          {lic.universeId && (
                            <button onClick={() => handleResetBinding(lic.id)}
                              className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-xs hover:bg-orange-500/20 transition-all">Reset Binding</button>
                          )}
                          <button onClick={() => handleRegenerate(lic.id)}
                            className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all">Regen</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Generate Modal */}
      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) setGenerating(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-white mb-4">Generate License</h3>

              {newKey ? (
                <div className="text-center py-4">
                  <p className="text-sm text-green-400 mb-2">License generated!</p>
                  <code className="text-lg font-bold text-purple-400 bg-dark-700 px-4 py-2 rounded-lg block font-mono">{newKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(newKey); }} className="mt-3 text-xs text-purple-400 hover:text-purple-300">Copy to clipboard</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">User ID *</label>
                    <input type="text" value={genForm.userId} onChange={(e) => setGenForm({ ...genForm, userId: e.target.value })}
                      placeholder="Firebase UID"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Product ID</label>
                    <input type="text" value={genForm.productId} onChange={(e) => setGenForm({ ...genForm, productId: e.target.value })}
                      placeholder="Product document ID"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Product Name *</label>
                    <input type="text" value={genForm.productName} onChange={(e) => setGenForm({ ...genForm, productName: e.target.value })}
                      placeholder="e.g. Advanced Admin System"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Game ID (UniverseId)</label>
                    <input type="text" value={genForm.universeId} onChange={(e) => setGenForm({ ...genForm, universeId: e.target.value })}
                      placeholder="Roblox universe ID (e.g. 123456789)"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                    <p className="text-xs text-gray-500 mt-1">License will be pre-bound to this game ID</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Creator ID</label>
                    <input type="text" value={genForm.creatorId} onChange={(e) => setGenForm({ ...genForm, creatorId: e.target.value })}
                      placeholder="Roblox creator ID (e.g. 987654321)"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                    <p className="text-xs text-gray-500 mt-1">License will be pre-bound to this creator</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Duration</label>
                    <select value={genForm.durationMonths} onChange={(e) => setGenForm({ ...genForm, durationMonths: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                      <option value={1}>1 Month</option>
                      <option value={6}>6 Months</option>
                      <option value={12}>12 Months</option>
                      <option value={0}>Lifetime (no expiry)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Max Downloads (0 = unlimited)</label>
                    <input type="number" min="0" value={genForm.maxDownloads} onChange={(e) => setGenForm({ ...genForm, maxDownloads: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                {newKey ? (
                  <button onClick={() => { setGenerating(null); setNewKey(""); }} className="px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-all">Done</button>
                ) : (
                  <>
                    <button onClick={() => setGenerating(null)} className="px-5 py-2.5 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                    <button onClick={handleGenerate} disabled={genLoading || !genForm.userId.trim() || !genForm.productName.trim()}
                      className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium disabled:opacity-50 transition-all">
                      {genLoading ? "Generating..." : "Generate"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extend Modal */}
      <AnimatePresence>
        {extending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setExtending(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Extend License</h3>
              <p className="text-sm text-gray-400 mb-4">
                Extend <code className="text-purple-300">{extending.key}</code>
              </p>
              <div className="space-y-2 mb-6">
                {[1, 3, 6, 12].map((m) => (
                  <button key={m} onClick={() => setExtendMonths(m)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      extendMonths === m ? "border-purple-500 bg-purple-500/10" : "border-purple-500/10 bg-dark-600 hover:border-purple-500/30"
                    }`}>
                    <span className="text-sm text-white font-medium">+{m} Month{m > 1 ? "s" : ""}</span>
                    {extendMonths === m && <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setExtending(null)} className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleExtend} disabled={extendLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50 transition-all">
                  {extendLoading ? "Extending..." : "Extend"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
