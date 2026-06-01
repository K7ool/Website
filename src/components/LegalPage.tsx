"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { legalService } from "@/lib/firestore";
import type { LegalSection } from "@/lib/types";

interface LegalPageProps {
  type: "terms" | "privacy" | "refund";
  title: string;
  defaultSections: LegalSection[];
}

function renderContent(content: string) {
  if (!content) return null;
  return content.split("\n").map((line, j) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={j} />;
    if (trimmed.startsWith("- ")) {
      return (
        <li key={j} className="ml-4 text-gray-400 list-disc">
          {trimmed.slice(2)}
        </li>
      );
    }
    return <p key={j}>{trimmed}</p>;
  });
}

export default function LegalPage({ type, title, defaultSections }: LegalPageProps) {
  const [cmsSections, setCmsSections] = useState<LegalSection[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");
  const tocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = legalService.subscribe(type, (item) => {
      if (item?.sections?.length) {
        setCmsSections(item.sections);
        setLastUpdated(item.updatedAt || item.createdAt || null);
      }
    });
    return unsub;
  }, [type]);

  const sections = cmsSections || defaultSections;
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    const elements = document.querySelectorAll("[data-section-id]");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  }, []);

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            <span className="gradient-text">{title}</span>
          </h1>
          {formattedDate && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated: {formattedDate}
            </p>
          )}
        </motion.div>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          <div ref={tocRef} className="mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-28">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3 lg:mb-4">On this page</h3>
              <nav className="flex lg:flex-col gap-1.5 lg:gap-0.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {sections.map((section, i) => {
                  const id = `section-${i}`;
                  return (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`text-left whitespace-nowrap lg:whitespace-normal px-3 py-1.5 rounded-lg text-sm transition-all shrink-0 ${
                        activeSection === id
                          ? "bg-purple-600/15 text-purple-300 font-medium"
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      {section.heading}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          <div className="min-w-0">
            <div className="space-y-8">
              {sections.map((section, i) => {
                const id = `section-${i}`;
                const safeContent = section?.content || "";
                const safeHeading = section?.heading || `Section ${i + 1}`;
                return (
                  <motion.div
                    key={id}
                    id={id}
                    data-section-id={id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: i * 0.03 }}
                    className="scroll-mt-28"
                  >
                    <div className="glass rounded-xl p-6 sm:p-8 border border-purple-500/10 hover:border-purple-500/20 transition-all">
                      <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        {safeHeading}
                      </h2>
                      <div className="text-sm sm:text-base text-gray-300 leading-relaxed space-y-3">
                        {renderContent(safeContent)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
