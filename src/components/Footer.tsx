"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { siteSettingsService } from "@/lib/firestore";

const footerLinks = {
  Products: [
    { label: "Scripts", href: "/products?category=scripts" },
    { label: "Models", href: "/products?category=models" },
    { label: "UI Systems", href: "/products?category=ui-systems" },
    { label: "Admin Systems", href: "/products?category=admin-systems" },
    { label: "Vehicles", href: "/products?category=vehicles" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Custom Work", href: "/custom-development" },
    { label: "Contact", href: "/contact" },
  ],
  Support: [
    { label: "Documentation", href: "/documentation" },
    { label: "FAQ", href: "/documentation#faq" },
    { label: "Discord", href: "https://discord.gg/xEFTFB89jK" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund" },
  ],
};

const SOCIAL_ICONS: Record<string, { icon: string; label: string }> = {
  discord: { icon: "D", label: "discord" },
  twitter: { icon: "X", label: "twitter" },
  youtube: { icon: "Y", label: "youtube" },
  github: { icon: "G", label: "github" },
};

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    return siteSettingsService.subscribe(setSettings);
  }, []);

  const socialLinks = [
    { key: "Discord", url: settings?.footerDiscord },
    { key: "Twitter", url: settings?.footerTwitter },
    { key: "YouTube", url: settings?.footerYoutube },
    { key: "GitHub", url: settings?.footerGithub },
  ];

  return (
    <footer className="border-t border-purple-500/10 bg-dark-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold text-lg text-white">Flipp<span className="text-purple-400">Studios</span></span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Building Premium Roblox Experiences. High-quality scripts, systems, and models for developers.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                s.url ? (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-dark-600 hover:bg-purple-600/20 border border-purple-500/10 flex items-center justify-center text-gray-400 hover:text-purple-400 transition-all"
                  >
                    <span className="text-xs uppercase font-bold">{s.key[0]}</span>
                  </a>
                ) : null
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-white text-sm mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-purple-500/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {settings?.footerCopyright || `© ${new Date().getFullYear()} Flipp Studios. All rights reserved.`}
          </p>
          <p className="text-sm text-gray-500">
            Built with ♥ for the Roblox community
          </p>
        </div>
      </div>
    </footer>
  );
}
