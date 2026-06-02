"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { orderBy } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { incidentService } from "@/lib/firestore";

const SEVERITIES = [
  { value: "info", label: "Info", color: "text-blue-400 bg-blue-500/10" },
  { value: "minor", label: "Minor", color: "text-yellow-400 bg-yellow-500/10" },
  { value: "major", label: "Major", color: "text-orange-400 bg-orange-500/10" },
  { value: "critical", label: "Critical", color: "text-red-400 bg-red-500/10" },
];

const STATUSES = [
  { value: "investigating", label: "Investigating", color: "text-yellow-400 bg-yellow-500/10" },
  { value: "identified", label: "Identified", color: "text-blue-400 bg-blue-500/10" },
  { value: "monitoring", label: "Monitoring", color: "text-purple-400 bg-purple-500/10" },
  { value: "resolved", label: "Resolved", color: "text-green-400 bg-green-500/10" },
  { value: "maintenance", label: "Scheduled Maintenance", color: "text-gray-400 bg-gray-500/10" },
];

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { title: "", slug: "", description: "", severity: "minor", status: "investigating", isPinned: false, isVisible: true };
  const [form, setForm] = useState(emptyForm);
  const [newUpdate, setNewUpdate] = useState("");

  useEffect(() => {
    const unsub = incidentService.subscribe((items) => {
      setIncidents(items);
      setLoading(false);
    }, [orderBy("createdAt", "desc")]);
    return unsub;
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setNewUpdate("");
    setShowForm(true);
  };

  const openEdit = (inc: any) => {
    setEditing(inc);
    setForm({ title: inc.title || "", slug: inc.slug || "", description: inc.description || "", severity: inc.severity || "minor", status: inc.status || "investigating", isPinned: inc.isPinned || false, isVisible: inc.isVisible !== false });
    setNewUpdate("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data: any = { ...form };
      if (!data.slug) data.slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (editing) {
        await incidentService.update(editing.id, data);
      } else {
        await incidentService.create(data);
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const addUpdate = async () => {
    if (!newUpdate.trim() || !editing) return;
    try {
      const inc = await incidentService.getById(editing.id);
      const timeline = inc?.timeline || [];
      timeline.push({ status: form.status, message: newUpdate.trim(), createdAt: new Date().toLocaleString() });
      await incidentService.update(editing.id, { timeline });
      setNewUpdate("");
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this incident permanently?")) return;
    await incidentService.delete(id);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Incident Management</h2>
        <button onClick={openNew} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">+ New Incident</button>
      </div>

      <div className="space-y-3">
        {incidents.map((inc) => (
          <GlassCard key={inc.id} className="hover:border-purple-500/20 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{inc.title}</h3>
                  {inc.isPinned && <span className="text-[10px] text-purple-400">📌 Pinned</span>}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded ${SEVERITIES.find(s => s.value === inc.severity)?.color || "text-gray-400 bg-gray-500/10"}`}>
                    {inc.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded ${STATUSES.find(s => s.value === inc.status)?.color || "text-gray-400 bg-gray-500/10"}`}>
                    {inc.status}
                  </span>
                  {!inc.isVisible && <span className="px-2 py-0.5 rounded text-gray-400 bg-gray-500/10">Hidden</span>}
                  <span className="text-gray-500">{inc.createdAt ? new Date(inc.createdAt).toLocaleDateString() : ""}</span>
                </div>
                {inc.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{inc.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => incidentService.update(inc.id, { isPinned: !inc.isPinned })} className="px-2 py-1 rounded text-xs text-purple-400 hover:bg-purple-500/10 transition-all">
                  {inc.isPinned ? "Unpin" : "Pin"}
                </button>
                <button onClick={() => openEdit(inc)} className="px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/10 transition-all">Edit</button>
                <button onClick={() => handleDelete(inc.id)} className="px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/10 transition-all">Delete</button>
              </div>
            </div>
          </GlassCard>
        ))}
        {incidents.length === 0 && (
          <GlassCard><p className="text-sm text-gray-400 text-center py-10">No incidents yet.</p></GlassCard>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditing(null); } }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 w-full max-w-lg my-8">
              <h3 className="text-lg font-bold text-white mb-4">{editing ? "Edit Incident" : "New Incident"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Dashboard Logs Loading Slowly"
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Slug</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="Auto-generated from title"
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Brief description of the incident"
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Severity</label>
                    <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500">
                      {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500">
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                      className="rounded bg-dark-600 border-purple-500/20" />
                    Pinned
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                      className="rounded bg-dark-600 border-purple-500/20" />
                    Visible
                  </label>
                </div>
              </div>

              {editing && (
                <div className="mt-6 pt-4 border-t border-purple-500/10">
                  <h4 className="text-sm font-semibold text-white mb-2">Timeline Updates</h4>
                  <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                    {(editing.timeline || []).map((t: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-gray-500 shrink-0 w-16">{t.createdAt || ""}</span>
                        <span className={`px-1.5 py-0.5 rounded shrink-0 ${STATUSES.find(s => s.value === t.status)?.color || "text-gray-400 bg-gray-500/10"}`}>{t.status}</span>
                        <span className="text-gray-300">{t.message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)}
                      placeholder="Add an update..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                    <button onClick={addUpdate} disabled={!newUpdate.trim()}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs hover:bg-purple-500 disabled:opacity-40 transition-all">Add</button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-purple-500/10">
                <button onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-5 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim()}
                  className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 disabled:opacity-40 transition-all">
                  {saving ? "Saving..." : editing ? "Save" : "Create"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
