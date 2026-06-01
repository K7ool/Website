"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { achievementService } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";

const initialForm = { key: "", name: "", description: "", icon: "🏆", type: "purchase", requirement: { type: "purchases", value: 1 } };

export default function AdminAchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...initialForm });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTimeout.current = setTimeout(() => {
      if (loading) {
        setLoadError("Failed to load achievements. Check Firestore rules or console for details.");
        setLoading(false);
      }
    }, 8000);

    const unsub = achievementService.subscribe((items) => {
      setAchievements(items);
      setLoading(false);
      setLoadError(null);
      if (loadTimeout.current) clearTimeout(loadTimeout.current);
    });
    return () => {
      unsub();
      if (loadTimeout.current) clearTimeout(loadTimeout.current);
    };
  }, []);

  const openAdd = () => { setEditing(null); setForm({ ...initialForm }); setShowModal(true); };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ key: a.key || "", name: a.name || "", description: a.description || "", icon: a.icon || "🏆", type: a.type || "purchase", requirement: a.requirement || { type: "purchases", value: 1 } });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.key.trim()) return;
    setSubmitting(true);
    setError(null);
    if (!user) { setError("Not authenticated"); setSubmitting(false); return; }
    try {
      const token = await user.getIdToken();
      const data = {
        key: form.key.toLowerCase().replace(/\s+/g, "_"),
        name: form.name,
        description: form.description,
        icon: form.icon,
        type: form.type,
        requirement: form.requirement,
        ...(editing ? { id: editing.id } : {}),
      };

      const res = await fetch("/api/admin/achievements", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setShowModal(false); setEditing(null);
    } catch (err: any) {
      setError(`Error: ${err.message || err}`);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/achievements?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setError(`Delete failed: ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 animate-pulse">Loading Achievements...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 max-w-md text-center">
          {loadError}
        </div>
        <button onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all">
          Retry
        </button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Achievements</h2>
        <button onClick={openAdd}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">+ Add Achievement</button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 break-all">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-300 hover:text-white">&times;</button>
        </div>
      )}

      <GlassCard>
        {achievements.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No achievements defined. Create one or seed defaults from the API.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a: any) => (
              <div key={a.id} className="p-4 rounded-xl bg-dark-600 border border-purple-500/10">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{a.icon || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white">{a.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.type === "purchase" ? "bg-green-500/10 text-green-400" : a.type === "review" ? "bg-purple-500/10 text-purple-400" : a.type === "social" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"}`}>{a.type}</span>
                      <span className="text-[10px] text-gray-500">{a.requirement?.type}: {a.requirement?.value}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(a)}
                      className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">Edit</button>
                    <button onClick={() => setDeleteTarget(a)}
                      className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowModal(false); setEditing(null); }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">{editing ? "Edit Achievement" : "Add Achievement"}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Key *</label>
                    <input type="text" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      placeholder="my_achievement"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Icon (emoji)</label>
                    <input type="text" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      placeholder="🏆"
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-gray-300 focus:outline-none focus:border-purple-500">
                      <option value="purchase">Purchase</option>
                      <option value="review">Review</option>
                      <option value="social">Social</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Requirement Value</label>
                    <input type="number" min="0" value={form.requirement.value} onChange={(e) => setForm({ ...form, requirement: { ...form.requirement, value: parseInt(e.target.value) || 0 } })}
                      className="w-full px-4 py-2.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                <button onClick={() => { setShowModal(false); setEditing(null); }}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !form.name.trim() || !form.key.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-50 transition-all">
                  {submitting ? "Saving..." : editing ? "Save" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-2">Delete Achievement</h3>
              <p className="text-sm text-gray-400 mb-6">Delete <span className="text-white font-medium">{deleteTarget.name}</span>?</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition-all">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
