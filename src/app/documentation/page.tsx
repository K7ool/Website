"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { cn } from "@/lib/utils";

const docs = [
  {
    id: "getting-started",
    title: "Getting Started",
    content: `
      Welcome to Flipp Studios! This guide will help you get started with our products.
      
      ## Prerequisites
      - Roblox Studio installed
      - Basic understanding of Luau
      - A Roblox account
      
      ## Quick Start
      1. Purchase your desired product
      2. Download the file from your dashboard
      3. Open Roblox Studio
      4. Import the file into your place
      5. Follow the product-specific installation guide
      
      ## Support
      If you encounter any issues, join our Discord server for quick support.
    `,
  },
  {
    id: "installation",
    title: "Installation Guide",
    content: `
      ## General Installation Steps
      
      1. **Download** the product from your Flipp Studios dashboard
      2. **Extract** the ZIP file to a convenient location
      3. **Open** Roblox Studio and your game place
      4. **Import** the files via the Toolbox or directly into Explorer
      5. **Configure** settings in the provided Configuration module
      
      ## Specific Product Installation
      Each product comes with its own detailed installation guide. Check the product page for specific instructions.
      
      ## Troubleshooting
      - Ensure all dependencies are installed
      - Check that you have the latest version
      - Verify your Roblox Studio is up to date
    `,
  },
  {
    id: "faq",
    title: "FAQ",
    content: `
      ## Frequently Asked Questions
      
      **How do I get support?**
      Join our Discord server or open a support ticket in your dashboard.
      
      **Can I get a refund?**
      Yes, we offer refunds within 14 days of purchase if the product doesn't meet expectations.
      
      **Do I need to credit Flipp Studios?**
      Credit is appreciated but not required for most products.
      
      **Can I modify the scripts?**
      Yes, all our products are fully customizable.
      
      **How do I update a product?**
      Check your dashboard for updates. You'll receive notifications when new versions are available.
    `,
  },
  {
    id: "api",
    title: "API Reference",
    content: `
      ## API Reference
      
      Our systems expose various APIs for developers to integrate with.
      
      ### Module Structure
      \`\`\`lua
      local System = require(path.to.module)
      
      -- Initialize
      System:Init({
          apiKey = "your-key",
          debug = false,
      })
      
      -- Use functions
      System:DoSomething()
      \`\`\`
      
      ### Available Methods
      See the full API documentation in the product's included documentation folder.
    `,
  },
  {
    id: "changelog",
    title: "Changelog",
    content: `
      ## Version History
      
      ### v2.1.0 (April 2026)
      - Performance improvements
      - New UI components added
      - Bug fixes
      
      ### v2.0.0 (March 2026)
      - Major system overhaul
      - New module architecture
      - Enhanced security
      
      ### v1.0.0 (January 2026)
      - Initial release
    `,
  },
];

export default function DocumentationPage() {
  const [activeDoc, setActiveDoc] = useState(docs[0].id);
  const [search, setSearch] = useState("");

  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase())
  );

  const current = docs.find((d) => d.id === activeDoc) || docs[0];

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-64 shrink-0"
          >
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search docs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-dark-600 border border-purple-500/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/30"
                />
              </div>
              <nav className="space-y-1">
                {filtered.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setActiveDoc(doc.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all",
                      activeDoc === doc.id
                        ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {doc.title}
                  </button>
                ))}
              </nav>
            </div>
          </motion.aside>

          {/* Content */}
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 min-w-0"
          >
            <GlassCard className="!p-8">
              <h2 className="text-2xl font-bold text-white mb-6">{current.title}</h2>
              <div className="prose prose-invert max-w-none">
                {current.content.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) {
                    return (
                      <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-3">
                        {line.replace("## ", "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h4 key={i} className="text-base font-semibold text-white mt-4 mb-2">
                        {line.replace("### ", "")}
                      </h4>
                    );
                  }
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <p key={i} className="text-gray-300 mb-2">
                        <strong>{line.replace(/\*\*/g, "")}</strong>
                      </p>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="text-gray-400 ml-4 mb-1">
                        {line.replace("- ", "")}
                      </li>
                    );
                  }
                  if (line.startsWith("1. ")) {
                    return (
                      <li key={i} className="text-gray-400 ml-4 mb-1 list-decimal">
                        {line.replace(/^\d+\. /, "")}
                      </li>
                    );
                  }
                  if (line.startsWith("```")) {
                    return <div key={i} className="my-2" />;
                  }
                  if (line.trim()) {
                    return (
                      <p key={i} className="text-gray-400 mb-2 leading-relaxed">
                        {line}
                      </p>
                    );
                  }
                  return <div key={i} className="h-2" />;
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
