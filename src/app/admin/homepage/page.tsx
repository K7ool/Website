"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { homepageService, productService } from "@/lib/firestore";

const DEFAULT_HOMEPAGE = {
  heroTitle: "Premium Roblox <br/>Development",
  heroSubtitle: "Professional systems, scripts, UI frameworks and custom development solutions for your Roblox games.",
  heroButtonText: "Browse Products",
  heroButtonUrl: "/products",
  heroImage: "",
  featuredEnabled: true,
  featuredProductIds: [],
  whyTitle: "Why Choose Us",
  whyDescription: "We deliver quality Roblox development with every project.",
  whyFeatures: ["Professional Code", "Fast Delivery", "Lifetime Updates", "Premium Support", "Secure Licensing", "Optimized Performance"],
  statsEnabled: true,
  testimonialsEnabled: true,
};

export default function AdminHomepagePage() {
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = homepageService.subscribe((item) => { setData(item); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = productService.subscribe(setProducts);
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const form: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "featuredEnabled" || k === "statsEnabled" || k === "testimonialsEnabled") {
        form[k] = el.checked;
      } else if (k === "whyFeatures") {
        form.whyFeatures = el.value.split("\n").filter((s: string) => s.trim());
      } else if (k === "featuredProductIds") {
        const selected = Array.from(el.selectedOptions).map((o: any) => o.value);
        form.featuredProductIds = selected;
      } else {
        form[k] = el.value;
      }
    });
    await homepageService.set(form);
    setSaving(false);
  };

  const loadDefaults = async () => {
    setSeeding(true);
    await homepageService.set(DEFAULT_HOMEPAGE);
    setSeeding(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!data) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Homepage CMS</h2>
        </div>
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">No homepage content configured yet.</p>
          <button onClick={loadDefaults} disabled={seeding}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-40">
            {seeding ? "Loading..." : "Load Default Content"}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Homepage CMS</h2>
        <div className="flex gap-2">
          <button onClick={loadDefaults} disabled={seeding}
            className="px-4 py-2 rounded-lg bg-dark-600 hover:bg-dark-500 disabled:opacity-40 text-gray-300 text-sm font-medium transition-all">
            {seeding ? "Loading..." : "Reset Defaults"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Hero Section</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "heroTitle", label: "Title" },
              { key: "heroSubtitle", label: "Subtitle" },
              { key: "heroButtonText", label: "Button Text" },
              { key: "heroButtonUrl", label: "Button URL" },
              { key: "heroImage", label: "Hero Image URL" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input ref={(el) => { if (el) formRef.current[f.key] = el; }} defaultValue={data?.[f.key] || ""}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Featured Products Section</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" ref={(el) => { if (el) formRef.current.featuredEnabled = el; }} defaultChecked={data?.featuredEnabled !== false} className="rounded bg-dark-600 border-purple-500/20" />
              Enable Featured Products Section
            </label>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Select Products</label>
              <select ref={(el) => { if (el) formRef.current.featuredProductIds = el; }} defaultValue={(data?.featuredProductIds || []).filter(Boolean)} multiple
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 min-h-[120px]">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Why Choose Us Section</h3>
          <div className="space-y-4">
            {[
              { key: "whyTitle", label: "Title" },
              { key: "whyDescription", label: "Description" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input ref={(el) => { if (el) formRef.current[f.key] = el; }} defaultValue={data?.[f.key] || ""}
                  className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
              </div>
            ))}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Features (one per line)</label>
              <textarea ref={(el) => { if (el) formRef.current.whyFeatures = el; }} defaultValue={(data?.whyFeatures || []).join("\n")}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={4} />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">Section Toggles</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" ref={(el) => { if (el) formRef.current.statsEnabled = el; }} defaultChecked={data?.statsEnabled !== false} className="rounded bg-dark-600 border-purple-500/20" />
              Enable Stats Section
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" ref={(el) => { if (el) formRef.current.testimonialsEnabled = el; }} defaultChecked={data?.testimonialsEnabled !== false} className="rounded bg-dark-600 border-purple-500/20" />
              Enable Testimonials Section
            </label>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
