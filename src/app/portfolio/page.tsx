"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import SectionHeading from "@/components/SectionHeading";
import { portfolioService, statisticsService } from "@/lib/firestore";

export default function PortfolioPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub1 = portfolioService.subscribe(setProjects);
    const unsub2 = statisticsService.subscribe((items) => { setStats(items); setLoading(false); });
    return () => { unsub1(); unsub2(); };
  }, []);

  if (loading) {
    return <div className="pt-24 pb-16 flex justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const published = projects.filter((p) => p.status !== "draft");

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title="Our Portfolio" subtitle="Showcasing our best work in Roblox development" />

        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, i) => (
              <GlassCard key={stat.id || i} delay={i * 0.1} className="text-center">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </GlassCard>
            ))}
          </div>
        )}

        {published.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {published.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
              >
                <GlassCard className="h-full flex flex-col card-shine">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mb-4 overflow-hidden">
                    {project.coverImage ? (
                      <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                    ) : project.thumbnail ? (
                      <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{project.title?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {project.category && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                        {project.category}
                      </span>
                    )}
                    {project.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                  <p className="text-sm text-gray-400 flex-1 mb-4">{project.description}</p>
                  {(project.youtubeUrl || project.robloxGameLink || project.documentationLink) && (
                    <div className="flex gap-2 flex-wrap">
                      {project.youtubeUrl && (
                        <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-all">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          YouTube
                        </a>
                      )}
                      {project.robloxGameLink && (
                        <a href={project.robloxGameLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
                          Roblox Game
                        </a>
                      )}
                      {project.documentationLink && (
                        <a href={project.documentationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          Docs
                        </a>
                      )}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : null}

        <SectionHeading
          title="Want Something Custom?"
          subtitle="Let us build the perfect system for your Roblox game"
        />
        <div className="text-center">
          <a
            href="/custom-development"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-xl shadow-purple-500/30"
          >
            Start a Project
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
