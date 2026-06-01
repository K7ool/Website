"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { portfolioService } from "@/lib/firestore";

const STARTER_PROJECTS = [
  { title: "Advanced Building System", slug: "advanced-building-system", category: "Building System", description: "Professional Roblox building system featuring grid placement, rotation, snapping, categories, advanced UI, model placement, save/load support, and optimized multiplayer building mechanics.", thumbnail: "", coverImage: "", gallery: [], youtubeUrl: "", robloxGameLink: "", documentationLink: "", tags: ["Building", "System", "Roblox", "Construction", "Sandbox"], visits: "", status: "published", featured: true, sortOrder: 0 },
];

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = portfolioService.subscribe((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "featured") {
        data.featured = el.checked;
      } else if (k === "gallery") {
        data.gallery = el.value.split("\n").map((s: string) => s.trim()).filter(Boolean);
      } else if (k === "tags") {
        data.tags = el.value.split(",").map((s: string) => s.trim()).filter(Boolean);
      } else if (el?.tagName === "SELECT" || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") {
        data[k] = el.value;
      }
    });
    if (editing) {
      await portfolioService.update(editing.id, data);
    } else {
      await portfolioService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const project of STARTER_PROJECTS) {
      await portfolioService.create(project);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">Add Project</button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit Project" : "New Project"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { key: "title", label: "Title" },
              { key: "slug", label: "Slug" },
              { key: "category", label: "Category" },
              { key: "description", label: "Description", textarea: true },
              { key: "thumbnail", label: "Thumbnail URL" },
              { key: "coverImage", label: "Cover Image URL" },
              { key: "youtubeUrl", label: "YouTube Showcase URL" },
              { key: "robloxGameLink", label: "Roblox Game Link" },
              { key: "documentationLink", label: "Documentation Link" },
              { key: "tags", label: "Tags (comma separated)" },
            ].map((f) => (
              <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                {f.textarea ? (
                  <textarea ref={(el) => { if (el) formRef.current[f.key] = el; }} defaultValue={editing?.[f.key] || ""}
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={3} />
                ) : (
                  <input ref={(el) => { if (el) formRef.current[f.key] = el; }} defaultValue={editing?.[f.key] || ""}
                    className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Gallery Image URLs (one per line)</label>
              <textarea ref={(el) => { if (el) { formRef.current.gallery = el; } }} defaultValue={(editing?.gallery || []).join("\n")}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={3} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Status</label>
              <select ref={(el) => { if (el) formRef.current.status = el; }} defaultValue={editing?.status || "draft"}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort Order</label>
              <input type="number" ref={(el) => { if (el) formRef.current.sortOrder = el; }} defaultValue={editing?.sortOrder || 0}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" ref={(el) => { if (el) formRef.current.featured = el; }} defaultChecked={editing?.featured || false} className="rounded bg-dark-600 border-purple-500/20" />
                Featured
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
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">{item.title?.charAt(0)}</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{item.category} &middot; {item.status}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${item.featured ? "bg-purple-500/10 text-purple-400" : "bg-dark-600 text-gray-500"}`}>{item.featured ? "Featured" : "No Feature"}</span>
                <button onClick={() => portfolioService.update(item.id, { featured: !item.featured })} className="text-xs text-purple-400 hover:text-purple-300">Toggle</button>
                <button onClick={() => { setEditing(item); setShowForm(true); Object.keys(formRef.current).forEach(k => { const el = formRef.current[k]; if (k === "gallery") { el.value = (item.gallery || []).join("\n"); } else if (k === "tags") { el.value = (item.tags || []).join(", "); } else if (k === "featured") { el.checked = item.featured ?? false; } else if (el?.tagName === "SELECT" || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") { el.value = item[k] ?? ""; } }); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                <button onClick={() => { if (confirm("Delete this project?")) portfolioService.remove(item.id); }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No projects yet.</p>
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
