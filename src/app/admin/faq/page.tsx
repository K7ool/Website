"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { faqService } from "@/lib/firestore";

const STARTER_FAQS = [
  { question: "How do I receive my product after purchase?", answer: "After your payment is confirmed and approved by the admin team, a license key will be generated and you will receive access to download the product files from your Dashboard under My Products. You will also receive an invoice via email.", sortOrder: 0 },
  { question: "Can I get updates for products I purchase?", answer: "Yes! All products come with lifetime updates. When a product is updated, you will be able to download the latest version from your Dashboard at no additional cost. Major version changes may be announced via our Discord server.", sortOrder: 1 },
  { question: "Do you offer refunds on digital products?", answer: "Due to the digital nature of our products, most purchases are non-refundable once delivered. However, refunds may be granted if the product has not been delivered, is completely unusable, or a duplicate payment occurred. Custom development deposits are non-refundable once work has begun.", sortOrder: 2 },
  { question: "Can I use the products commercially in my Roblox games?", answer: "Yes! All purchased products come with a commercial license that allows you to use them in your Roblox games, including monetized experiences. Redistribution and reselling of the source code is strictly prohibited.", sortOrder: 3 },
  { question: "Do you provide support after purchase?", answer: "Absolutely. Every product includes support via our ticket system and Discord community. Support covers installation assistance, bug fixes, and guidance on using the product. Custom modification requests may be quoted separately.", sortOrder: 4 },
  { question: "Can I request custom work not listed on the site?", answer: "Yes! We offer custom development services for any Roblox-related project. Contact us through the Custom Development page or join our Discord server to discuss your project requirements and get a quote.", sortOrder: 5 },
  { question: "How do licenses work for purchased products?", answer: "Each purchase generates a unique license key (format: FLIPP-XXXX-XXXX-XXXX). License keys may have an expiration date depending on the product. Sharing license keys is strictly prohibited and may result in revocation of access.", sortOrder: 6 },
  { question: "Do products include full source code?", answer: "Yes, all products include the complete, un-obfuscated source code. You can modify, customize, and integrate the code into your projects as needed. We believe in providing full transparency and flexibility to our customers.", sortOrder: 7 },
];

export default function AdminFaqPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const formRef = useRef<any>({});

  useEffect(() => {
    const unsub = faqService.subscribe((data) => { setItems(data); setLoading(false); });
    return unsub;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data: any = {};
    Object.keys(formRef.current).forEach((k) => {
      const el = formRef.current[k];
      if (k === "sortOrder") data.sortOrder = Number(el.value);
      else data[k] = el.value;
    });
    if (editing) {
      await faqService.update(editing.id, data);
    } else {
      await faqService.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setSaving(false);
  };

  const loadStarter = async () => {
    setSeeding(true);
    for (const faq of STARTER_FAQS) {
      await faqService.create(faq);
    }
    setSeeding(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">FAQ</h2>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all">Add FAQ</button>
      </div>

      {showForm && (
        <GlassCard className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{editing ? "Edit FAQ" : "New FAQ"}</h3>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Question</label>
              <input ref={(el) => { if (el) formRef.current.question = el; }} defaultValue={editing?.question || ""}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Answer</label>
              <textarea ref={(el) => { if (el) formRef.current.answer = el; }} defaultValue={editing?.answer || ""}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500 resize-none" rows={4} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sort Order</label>
              <input type="number" ref={(el) => { if (el) formRef.current.sortOrder = el; }} defaultValue={editing?.sortOrder || 0}
                className="w-full px-3 py-2 rounded-lg bg-dark-700 border border-purple-500/20 text-sm text-white focus:outline-none focus:border-purple-500" />
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
        {items.map((item, i) => (
          <GlassCard key={item.id} className="hover:border-purple-500/20 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">#{i + 1}</span>
                  <p className="text-sm font-medium text-white">{item.question}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.answer}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-blue-400 hover:text-blue-300">Edit</button>
                <button onClick={() => { if (confirm("Delete?")) faqService.remove(item.id); }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No FAQs yet.</p>
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
