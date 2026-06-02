import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FooterWrapper from "@/components/FooterWrapper";
import ParticleBackground from "@/components/ParticleBackground";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import StatusBanner from "@/components/status/StatusBanner";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Flipp Studios - Premium Roblox Scripts & Models",
  description: "High-quality Roblox systems, scripts, UI packs, and models built for developers. Building Premium Roblox Experiences.",
  keywords: "roblox scripts, roblox models, roblox ui, game development, roblox studio",
  icons: [{ rel: "icon", url: "/favicon.png" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-dark-900">
        <AuthProvider>
          <ParticleBackground />
          <Navbar />
          <StatusBanner />
          <main className="flex-1 relative z-10">{children}</main>
          <FooterWrapper />
          <CookieConsentBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
