"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { testimonialService } from "@/lib/firestore";

const STARTER_TESTIMONIALS = [
  { name: "Alex Mitchell", avatar: "", position: "Game Developer", rating: 5, featured: true, review: "The admin system is incredibly well-built. Clean code, thorough documentation, and the support team helped me customize everything for my specific game. Highly recommend to any developer serious about quality." },
  { name: "Sarah Kim", avatar: "", position: "Studio Owner", rating: 5, featured: true, review: "We've purchased multiple products from Flipp Studios and every single one exceeded expectations. The vehicle system alone transformed our racing game. Professional, optimized, and regularly updated." },
  { name: "Mike Rodriguez", avatar: "", position: "Indie Developer", rating: 5, featured: true, review: "One of the best Roblox development resources available. The modern UI library saved me months of work. Every component is polished and the source code is beautifully organized." },
  { name: "Emily Thompson", avatar: "", position: "Game Designer", rating: 5, featured: true, review: "The economy framework is incredibly robust and easy to customize. I had it integrated into my game within hours. The documentation is thorough and the code is well-commented." },
  { name: "James Liu", avatar: "", position: "Developer", rating: 4, featured: false, review: "Great building system with excellent multiplayer sync. Solid product with good support. Would love to see more prefab templates included in future updates." },
  { name: "Sophia Williams", avatar: "", position: "Startup Founder", rating: 5, featured: false, review: "Purchased a custom development package and couldn't be happier. Professional communication, regular progress updates, and the final product was top-tier quality. Will definitely work with them again." },
];

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = testimonialService.subscribe((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "featured") data.featured = el.checked;
      else if (k === "rating") data.rating = Number(el.value);
      else data[k] = el.value;
    });
    if (editing) {
      await testimonialService.update(editing.id, data);
    } else {
      await testimonialService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const t of STARTER_TESTIMONIALS) {
      await testimonialService.create(t);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Testimonials</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">Add Testimonial</button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit Testimonial" : "New Testimonial"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[
              { key: "name", label: "Name" },
              { key: "avatar", label: "Avatar URL" },
              { key: "position", label: "Position / Title" },
              { key: "rating", label: "Rating (1-5)", type: "number" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input ref={(el) => { if (el) formRef.current[f.key] = el; }} type={f.type || "text"} defaultValue={editing?.[f.key] || ""}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Review</label>
              <textarea ref={(el) => { if (el) formRef.current.review = el; }} defaultValue={editing?.review || ""}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={3} />
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
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.avatar ? (
                  <img src={item.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">{item.name?.charAt(0)}</div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  {item.position && <p className="text-xs text-gray-500">{item.position}</p>}
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-3 h-3 ${i < (item.rating || 0) ? "text-yellow-500" : "text-dark-500"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => testimonialService.update(item.id, { featured: !item.featured })} className="text-xs text-purple-400 hover:text-purple-300">{item.featured ? "Unfeature" : "Feature"}</button>
                <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                <button onClick={() => { if (confirm("Delete?")) testimonialService.remove(item.id); }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">&ldquo;{item.review}&rdquo;</p>
          </GlassCard>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No testimonials yet.</p>
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
