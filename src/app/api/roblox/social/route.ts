import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ROBLOX_HEADERS = {
  "User-Agent": "FlippStudios/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...ROBLOX_HEADERS, ...opts?.headers }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type") || "friends";
  const cursor = searchParams.get("cursor") || "";

  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json({ success: false, error: "Valid userId required" }, { status: 400 });
  }

  if (!["friends", "followers", "following"].includes(type)) {
    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  }

  const rl = checkRateLimit(ip, { max: 15, windowMs: 10000, store: "roblox-social" });
  if (!rl) {
    return NextResponse.json({ success: false, error: "Rate limit" }, { status: 429 });
  }

  try {
    const baseUrl = `https://friends.roblox.com/v1/users/${userId}/${type}`;
    const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;
    const data = await fetchJson(url);

    if (!data) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const users = (data.data || []).map((u: any) => ({
      userId: u.id || u.userId,
      username: u.name || u.username,
      displayName: u.displayName,
      hasVerifiedBadge: u.hasVerifiedBadge || false,
      isOnline: u.isOnline || false,
      avatarHeadshot: `https://thumbnails.roblox.com/v1/users/headshot?userIds=${u.id || u.userId}&size=150x150&format=Png`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users,
        nextPageCursor: data.nextPageCursor || null,
        previousPageCursor: data.previousPageCursor || null,
        totalCount: data.total || users.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Lookup failed" }, { status: 500 });
  }
}
