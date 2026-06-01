"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { announcementService } from "@/lib/firestore";

const COLORS = [
  { label: "Purple", value: "purple" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
  { label: "Red", value: "red" },
  { label: "Yellow", value: "yellow" },
  { label: "Orange", value: "orange" },
];

const STARTER_ANNOUNCEMENTS = [
  { text: "🚀 New Product Released - Advanced Building System", color: "purple", active: true, expiryDate: "" },
  { text: "🔥 Summer Sale - 20% OFF All Products", color: "orange", active: true, expiryDate: "" },
  { text: "✨ Portfolio Updated - Check out our latest work", color: "blue", active: true, expiryDate: "" },
];

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = announcementService.subscribe((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "active") data.active = el.checked;
      else data[k] = el.value;
    });
    if (editing) {
      await announcementService.update(editing.id, data);
    } else {
      await announcementService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const a of STARTER_ANNOUNCEMENTS) {
      await announcementService.create(a);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">Add Announcement</button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit Announcement" : "New Announcement"}</h3>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Banner Text</label>
              <input ref={(el) => { if (el) formRef.current.text = el; }} defaultValue={editing?.text || ""} placeholder="e.g. 🔥 Summer Sale 20% OFF"
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color</label>
                <select ref={(el) => { if (el) formRef.current.color = el; }} defaultValue={editing?.color || "purple"}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500">
                  {COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
                <input type="date" ref={(el) => { if (el) formRef.current.expiryDate = el; }} defaultValue={editing?.expiryDate || ""}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" ref={(el) => { if (el) formRef.current.active = el; }} defaultChecked={editing?.active !== false} className="rounded bg-dark-600 border-purple-500/20" />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2 rounded-lg bg-dark-600 text-gray-300 text-sm hover:bg-dark-500 transition-all">Cancel</button>
          </div>
        </GlassCard>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <GlassCard key={item.id} className="hover:border-purple-500/20 transition-all">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-medium shrink-0 ${
                  item.color === "green" ? "bg-green-500/10 text-green-400" :
                  item.color === "blue" ? "bg-blue-500/10 text-blue-400" :
                  item.color === "red" ? "bg-red-500/10 text-red-400" :
                  item.color === "yellow" ? "bg-yellow-500/10 text-yellow-400" :
                  item.color === "orange" ? "bg-orange-500/10 text-orange-400" :
                  "bg-purple-500/10 text-purple-400"
                }`}>{item.text}</div>
                <span className={`text-xs ${item.active ? "text-green-400" : "text-gray-500"}`}>{item.active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => announcementService.update(item.id, { active: !item.active })} className="text-xs text-purple-400 hover:text-purple-300">Toggle</button>
                <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                <button onClick={() => { if (confirm("Delete?")) announcementService.remove(item.id); }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No announcements yet.</p>
            <button onClick={loadStarter} disabled={seeding}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-40">
              {seeding ? "Loading..." : "Load Starter Content"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
