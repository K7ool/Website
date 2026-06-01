"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { siteSettingsService } from "@/lib/firestore";

export default function AdminSiteSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = siteSettingsService.subscribe((item) => { setData(item); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const form: any = {};
    Object.keys(formRef.current).forEach((k) => {
      form[k] = formRef.current[k].value;
    });
    await siteSettingsService.set({ ...data, ...form });
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const fields = [
    { key: "siteName", label: "Site Name" },
    { key: "logo", label: "Logo URL" },
    { key: "favicon", label: "Favicon URL" },
    { key: "contactEmail", label: "Contact Email" },
    { key: "discordLink", label: "Discord Link" },
    { key: "seoTitle", label: "SEO Title" },
    { key: "seoDescription", label: "SEO Description" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Site Settings</h2>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
      <GlassCard>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
              <input ref={(el) => { if (el) formRef.current[f.key] = el; }} defaultValue={data?.[f.key] || ""}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}
