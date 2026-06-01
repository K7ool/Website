"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { legalService } from "@/lib/firestore";

type LegalType = "terms" | "privacy" | "refund";

const LEGAL_TABS: { type: LegalType; label: string }[] = [
  { type: "terms", label: "Terms of Service" },
  { type: "privacy", label: "Privacy Policy" },
  { type: "refund", label: "Refund Policy" },
];

const TAB_LABELS: Record<LegalType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

export default function AdminLegalPage() {
  const [activeTab, setActiveTab] = useState<LegalType>("terms");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<{ heading: string; content: string }[]>([]);
  const [title, setTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = legalService.subscribe(activeTab, (item) => {
      setData(item);
      setSections(item?.sections || []);
      setTitle(item?.title || TAB_LABELS[activeTab]);
      setLoading(false);
    });
    return unsub;
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await legalService.set(activeTab, { title, sections });
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to save legal content:", err);
    }
    setSaving(false);
  };

  const updateSection = (index: number, field: "heading" | "content", value: string) => {
    setSections((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const addSection = () => {
    setSections((prev) => [...prev, { heading: "", content: "" }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    setSections((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetFields = () => {
    setSections(data?.sections || []);
    setTitle(data?.title || TAB_LABELS[activeTab]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Legal Pages</h2>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-gray-500">Last saved: {lastSaved}</span>
          )}
          <button onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-300 text-sm font-medium transition-all">
            {showPreview ? "Edit" : "Preview"}
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-dark-700/50 border border-purple-500/10 w-fit">
        {LEGAL_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => { setActiveTab(tab.type); setShowPreview(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.type
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sections.length === 0 && !showPreview ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No content yet</h3>
          <p className="text-sm text-gray-500 mb-6">Click &quot;Add Section&quot; to start creating your {TAB_LABELS[activeTab]}.</p>
          <button onClick={addSection}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-500 hover:to-blue-500 transition-all">
            Add First Section
          </button>
        </div>
      ) : showPreview ? (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          </div>
          {sections.map((section, i) => (
            <div key={i} className="glass rounded-xl p-6 sm:p-8 border border-purple-500/10">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</span>
                {section.heading || "Untitled Section"}
              </h2>
              <div className="text-sm sm:text-base text-gray-300 leading-relaxed space-y-3">
                {(section.content || "").split("\n").map((line, j) => {
                  const t = line.trim();
                  if (!t) return <br key={j} />;
                  if (t.startsWith("- ")) return <li key={j} className="ml-4 text-gray-400 list-disc">{t.slice(2)}</li>;
                  return <p key={j}>{t}</p>;
                })}
              </div>
            </div>
          ))}
          <div className="text-center">
            <button onClick={() => setShowPreview(false)}
              className="px-6 py-3 rounded-xl glass text-white font-medium hover:bg-dark-600 transition-all border border-purple-500/20">
              Back to Editing
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <GlassCard>
            <label className="block text-sm text-gray-400 mb-1">Page Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Sections ({sections.length})</h3>
              <button onClick={addSection}
                className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 text-xs font-medium hover:bg-purple-600/30 transition-all">
                + Add Section
              </button>
            </div>

            {sections.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No sections yet. Click &quot;+ Add Section&quot; above.</p>
            ) : (
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <div key={i} className="p-4 rounded-lg bg-dark-700/50 border border-purple-500/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Section {i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(i, "up")} disabled={i === 0}
                          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => moveSection(i, "down")} disabled={i === sections.length - 1}
                          className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => removeSection(i)}
                          className="p-1 rounded text-red-400 hover:text-red-300">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Heading</label>
                      <input value={section.heading} onChange={(e) => updateSection(i, "heading", e.target.value)}
                        placeholder="Section heading"
                        className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Content</label>
                      <textarea value={section.content} onChange={(e) => updateSection(i, "content", e.target.value)}
                        placeholder="Section content. Use - prefix for bullet points."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <div className="flex items-center justify-between">
            <button onClick={resetFields}
              className="px-4 py-2 rounded-lg bg-dark-600 hover:bg-dark-500 text-gray-300 text-sm font-medium transition-all">
              Reset Changes
            </button>
            <div className="flex items-center gap-2">
              {lastSaved && <span className="text-xs text-gray-500">Saved at {lastSaved}</span>}
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-all">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
