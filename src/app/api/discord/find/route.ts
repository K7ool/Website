import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const DISCORD_LOOKUP_API = "https://discord.tsunstudio.pw/api";

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

    const formatted = {
      id: cleanId,
      username: data.username || "",
      discriminator: data.discriminator || "0",
      globalName: data.display_name || data.username || "",
      avatarUrl: data.avatarUrl || "",
      bannerUrl: data.bannerUrl || "",
      bannerColor: data.banner_color || null,
      badges: data.badges || [],
      createdAt: createdAt?.toISOString() || null,
      accountAgeDays,
      profileUrl: data.profileUrl || `https://discord.com/users/${cleanId}`,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Discord API timeout" }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
