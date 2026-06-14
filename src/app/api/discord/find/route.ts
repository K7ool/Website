import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const DISCORD_LOOKUP_API = "https://discord.tsunstudio.pw/api";

const BADGE_FLAGS: Record<number, { name: string; icon: string }> = {
  1: { name: "Discord Employee", icon: "🏷️" },
  2: { name: "Partnered Server Owner", icon: "🤝" },
  4: { name: "HypeSquad Events", icon: "🎉" },
  8: { name: "Bug Hunter Level 1", icon: "🐛" },
  16: { name: "House Bravery", icon: "🛡️" },
  32: { name: "House Brilliance", icon: "💡" },
  64: { name: "House Balance", icon: "⚖️" },
  128: { name: "Early Supporter", icon: "⭐" },
  256: { name: "Team User", icon: "👤" },
  512: { name: "System", icon: "⚙️" },
  1024: { name: "Bug Hunter Level 2", icon: "🐛" },
  4096: { name: "Verified Bot", icon: "🤖" },
  8192: { name: "Early Verified Bot Developer", icon: "👨‍💻" },
  16384: { name: "Discord Certified Moderator", icon: "🛡️" },
  131072: { name: "Bot HTTP Interactions", icon: "🔗" },
  262144: { name: "Active Developer", icon: "⚡" },
  1048576: { name: "Moderator Programs Alumni", icon: "🎓" },
  2097152: { name: "Automated Message Purger", icon: "🧹" },
  4194304: { name: "Early Supporter", icon: "⭐" },
  8388608: { name: "Discord Certified Moderator", icon: "🛡️" },
};

function decodeFlags(flags: number): { name: string; icon: string }[] {
  const badges: { name: string; icon: string }[] = [];
  for (const [bit, info] of Object.entries(BADGE_FLAGS)) {
    if (flags & Number(bit)) badges.push(info);
  }
  return badges;
}

function snowflakeToTimestamp(id: string): Date | null {
  try {
    const DISCORD_EPOCH_MS = 1420070400000;
    const timestampMs = Math.floor(Number(id) / Math.pow(2, 22)) + DISCORD_EPOCH_MS;
    return new Date(timestampMs);
  } catch {
    return null;
  }
}

function decodeSnowflake(id: string): { workerId: number; processId: number; sequence: number; timestampMs: number } | null {
  try {
    const n = Number(id);
    const timestampMs = Math.floor(n / Math.pow(2, 22)) + 1420070400000;
    const workerId = Math.floor(n / Math.pow(2, 17)) % 32;
    const processId = Math.floor(n / Math.pow(2, 12)) % 32;
    const sequence = n % Math.pow(2, 12);
    return { workerId, processId, sequence, timestampMs };
  } catch {
    return null;
  }
}

function formatAge(totalDays: number): { years: number; months: number; days: number; total: number } {
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  return { years, months, days, total: totalDays };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, { max: 20, windowMs: 60_000, store: "discord-find" })) {
      return NextResponse.json({ success: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    const { id } = await req.json();
    if (!id?.trim()) {
      return NextResponse.json({ success: false, error: "Discord User ID is required" }, { status: 400 });
    }

    const cleanId = id.trim();
    if (!/^\d{17,20}$/.test(cleanId)) {
      return NextResponse.json({ success: false, error: "Invalid Discord ID format. Must be 17-20 digits." }, { status: 400 });
    }

    const res = await fetch(`${DISCORD_LOOKUP_API}/${cleanId}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return NextResponse.json({ success: false, error: "Discord user not found" }, { status: 404 });
    }

    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Discord API error (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const createdAt = snowflakeToTimestamp(cleanId);
    const accountAgeDays = createdAt
      ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const decodedFlags = decodeFlags(data.public_flags || 0);
    const snowflake = decodeSnowflake(cleanId);
    const age = formatAge(accountAgeDays);

    const formatted = {
      id: cleanId,
      username: data.username || "",
      discriminator: data.discriminator || "0",
      globalName: data.display_name || data.username || "",
      avatarUrl: data.avatarUrl || "",
      bannerUrl: data.bannerUrl || "",
      bannerColor: data.banner_color || null,
      accentColor: data.accent_color || null,
      badges: decodedFlags,
      avatarDecoration: data.avatar_decoration?.asset || null,
      createdAt: createdAt?.toISOString() || null,
      createdAtFormatted: createdAt ? createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null,
      createdAtTime: createdAt ? createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : null,
      accountAgeDays,
      accountAge: age,
      profileUrl: data.profileUrl || `https://discord.com/users/${cleanId}`,
      snowflake,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Discord API timeout" }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
