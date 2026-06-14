import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const DISCORD_LOOKUP_API = "https://discordlookup.mesalytic.moe/v1/user";

const BADGE_FLAGS: Record<number, string> = {
  1: "DISCORD_EMPLOYEE",
  2: "DISCORD_PARTNER",
  4: "HYPESQUAD_EVENTS",
  8: "BUGHUNTER_LEVEL_1",
  16: "HOUSE_BRAVERY",
  32: "HOUSE_BRILLIANCE",
  64: "HOUSE_BALANCE",
  128: "EARLY_SUPPORTER",
  256: "TEAM_USER",
  512: "SYSTEM",
  1024: "BUGHUNTER_LEVEL_2",
  4096: "VERIFIED_BOT",
  8192: "EARLY_VERIFIED_BOT_DEVELOPER",
  131072: "CERTIFIED_MODERATOR",
  262144: "ACTIVE_DEVELOPER",
};

function decodeFlags(flags: number): string[] {
  const badges: string[] = [];
  for (const [bit, name] of Object.entries(BADGE_FLAGS)) {
    if (flags & Number(bit)) badges.push(name);
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
      headers: { "User-Agent": "FlippStudios/1.0" },
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

    let avatarUrl = "";
    if (data.avatar?.id) {
      const ext = data.avatar.is_animated ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${cleanId}/${data.avatar.id}.${ext}?size=1024`;
    }

    let bannerUrl = "";
    if (data.banner?.id) {
      const ext = data.banner.is_animated ? "gif" : "png";
      bannerUrl = `https://cdn.discordapp.com/banners/${cleanId}/${data.banner.id}.${ext}?size=1024`;
    }

    const formatted = {
      id: cleanId,
      username: data.tag?.split("#")[0] || "",
      discriminator: data.tag?.split("#")[1] || "0",
      globalName: data.global_name || data.username || "",
      avatarUrl,
      bannerUrl,
      bannerColor: data.banner?.color || null,
      badges: data.badges || [],
      createdAt: createdAt?.toISOString() || null,
      accountAgeDays,
      profileUrl: `https://discord.com/users/${cleanId}`,
      cdnAvatar: `https://cdn.discordapp.com/avatars/${cleanId}/${data.avatar?.id || "0"}.png`,
      cdnBanner: data.banner?.id
        ? `https://cdn.discordapp.com/banners/${cleanId}/${data.banner.id}.png`
        : null,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Discord API timeout" }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
