"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import SectionHeading from "@/components/SectionHeading";

const skills = ["Luau", "Roblox Studio", "UI Design", "Datastores", "ProfileService", "Knit Framework", "Fusion", "3D Modeling"];

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title="About Flipp Studios" subtitle="Building Premium Roblox Experiences since 2021" />

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold text-white">F</span>
          </div>
          <p className="text-lg text-gray-400 leading-relaxed">
            Flipp Studios is a premier Roblox development studio specializing in high-quality scripts, 
            systems, UI packs, and 3D models. Founded with a passion for game development, we have grown 
            into a trusted name in the Roblox community, serving thousands of developers worldwide.
          </p>
        </motion.div>

        {/* Skills */}
        <SectionHeading title="Our Skills" subtitle="Technologies and tools we specialize in" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {skills.map((skill, i) => (
            <GlassCard key={skill} delay={i * 0.05}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold gradient-text">{skill.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-white">{skill}</span>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Tech Stack */}
        <SectionHeading title="Technologies" subtitle="Built with modern tools and frameworks" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["Next.js 15", "TypeScript", "Tailwind CSS", "Framer Motion", "Supabase", "Stripe", "Luau", "Roblox Studio"].map((tech, i) => (
            <GlassCard key={tech} delay={i * 0.05} className="text-center py-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold gradient-text">{tech.charAt(0)}</span>
              </div>
              <span className="text-sm text-gray-300">{tech}</span>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
