"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  popular?: boolean;
  index?: number;
}

export default function PricingCard({ name, price, description, features, popular, index = 0 }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={cn(
        "relative glass rounded-2xl p-8 transition-all duration-300 card-shine",
        popular
          ? "border-purple-500/40 shadow-xl shadow-purple-500/20 scale-105"
          : "hover:border-purple-500/20"
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">${price}</span>
          <span className="text-gray-500 text-sm">/ project</span>
        </div>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
            <svg className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/contact"
        className={cn(
          "block w-full text-center py-3 rounded-xl font-medium transition-all",
          popular
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25"
            : "border border-purple-500/30 text-purple-300 hover:bg-purple-600/10"
        )}
      >
        Request a Quote
      </Link>
    </motion.div>
  );
}
