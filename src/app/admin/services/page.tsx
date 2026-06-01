"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { servicesService } from "@/lib/firestore";

const STARTER_SERVICES = [
  { name: "Roblox Scripting", description: "Custom gameplay systems, mechanics, data stores, combat systems, inventories, admin systems and more.", price: "$25+", features: ["Custom Gameplay Systems", "Data Stores", "Combat Systems", "Inventory Systems", "Admin Systems", "Optimization"], featured: true, icon: "code", displayOrder: 0 },
  { name: "UI / UX Design", description: "Professional Roblox interfaces, dashboards, shops, inventories, animations and responsive layouts.", price: "$30+", features: ["Custom UI Design", "Responsive Layouts", "Animations", "Mobile Support", "Dashboards", "Implementation"], featured: true, icon: "layout", displayOrder: 1 },
  { name: "Bug Fixing", description: "Fix broken systems, optimize scripts, eliminate errors, improve performance and stability.", price: "$15+", features: ["Bug Diagnosis", "Script Optimization", "Error Elimination", "Performance Tuning", "Stability Improvements", "Code Review"], featured: false, icon: "bug", displayOrder: 2 },
  { name: "Building Systems", description: "Advanced placement systems, grid building, sandbox tools, save/load systems and construction mechanics.", price: "$40+", features: ["Grid Placement", "Rotation & Snapping", "Save/Load", "Multiplayer Sync", "Category System", "Advanced UI"], featured: true, icon: "box", displayOrder: 3 },
  { name: "Admin Systems", description: "Moderation panels, ticket systems, user management, permissions and analytics dashboards.", price: "$35+", features: ["Moderation Panel", "Ticket System", "User Management", "Permissions", "Analytics", "Logging"], featured: false, icon: "shield", displayOrder: 4 },
  { name: "Full Game Development", description: "Complete Roblox game development from idea to release.", price: "$150+", features: ["Game Design", "Full Scripting", "World Building", "UI/UX", "System Integration", "Post-Launch Support"], featured: true, icon: "star", displayOrder: 5 },
];

export default function AdminServicesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = servicesService.subscribe((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "features") {
        data.features = el.value.split("\n").filter((s: string) => s.trim());
      } else if (k === "featured") {
        data.featured = el.checked;
      } else {
        data[k] = el.value;
      }
    });
    if (editing) {
      await servicesService.update(editing.id, data);
    } else {
      await servicesService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const service of STARTER_SERVICES) {
      await servicesService.create(service);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Services</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">Add Service</button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit Service" : "New Service"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { key: "name", label: "Name" },
              { key: "description", label: "Description" },
              { key: "price", label: "Price (e.g. $25+)" },
              { key: "icon", label: "Icon" },
              { key: "displayOrder", label: "Display Order", type: "number" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input ref={(el) => { if (el) formRef.current[f.key] = el; }} type={f.type || "text"} defaultValue={editing?.[f.key] || ""}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Features (one per line)</label>
              <textarea ref={(el) => { if (el) formRef.current.features = el; }} defaultValue={(editing?.features || []).join("\n")}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={4} />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <GlassCard key={item.id} className="hover:border-purple-500/20 transition-all">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">{item.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.featured ? "bg-purple-500/10 text-purple-400" : "bg-dark-600 text-gray-500"}`}>{item.featured ? "Featured" : "Standard"}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{item.price}</p>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
              <button onClick={() => { if (confirm("Delete this service?")) servicesService.remove(item.id); }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12 col-span-3">
            <p className="text-gray-400 mb-4">No services yet.</p>
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
