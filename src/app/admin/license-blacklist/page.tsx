"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { licenseBlacklistService } from "@/lib/firestore";

export default function AdminLicenseBlacklistPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "placeId" as "placeId" | "universeId" | "userId", value: "", reason: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = licenseBlacklistService.subscribe((items) => {
      setEntries(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async () => {
    if (!form.value.trim()) return;
    setSaving(true);
    try {
      await licenseBlacklistService.create(form);
      setForm({ type: "placeId", value: "", reason: "" });
      setShowForm(false);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    try { await licenseBlacklistService.toggle(id, !active); } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this blacklist entry?")) return;
    try { await licenseBlacklistService.delete(id); } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">License Blacklist</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all">
          {showForm ? "Cancel" : "+ Add Entry"}
        </button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white">
                <option value="placeId">Place ID</option>
                <option value="universeId">Universe ID</option>
                <option value="userId">User ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Value</label>
              <input type="text" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="e.g. 123456789"
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Reason</label>
              <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why is this blacklisted?"
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={saving || !form.value.trim()}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-red-500 transition-all">
            {saving ? "Adding..." : "Add to Blacklist"}
          </button>
        </GlassCard>
      )}

      {entries.length === 0 ? (
        <GlassCard><p className="text-sm text-gray-400 text-center py-10">No blacklist entries.</p></GlassCard>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-500/10">
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Value</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Reason</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Created</th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-purple-500/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        e.type === "placeId" ? "bg-blue-500/10 text-blue-400" :
                        e.type === "universeId" ? "bg-purple-500/10 text-purple-400" :
                        "bg-orange-500/10 text-orange-400"
                      }`}>{e.type}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-300 font-mono text-xs">{e.value}</td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{e.reason || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs ${e.active ? "text-green-400" : "text-gray-500"}`}>{e.active ? "Active" : "Disabled"}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggle(e.id, e.active)}
                          className={`px-2 py-1 rounded text-xs transition-all ${e.active ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-green-500/10 text-green-400 hover:bg-green-500/20"}`}>
                          {e.active ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => handleDelete(e.id)}
                          className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}
