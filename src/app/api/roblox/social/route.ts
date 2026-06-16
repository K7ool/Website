import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ROBLOX_HEADERS = {
  "User-Agent": "FlippStudios/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...ROBLOX_HEADERS, ...opts?.headers }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  return res.json();
}

async function batchFetchUsernames(ids: number[]): Promise<Record<number, { name: string; displayName: string }>> {
  const map: Record<number, { name: string; displayName: string }> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await fetchJson(`https://users.roblox.com/v1/users?userIds=${batch.join(",")}&excludeBannedUsers=false`);
    if (data?.data) {
      for (const u of data.data) {
        map[u.id] = { name: u.name || "", displayName: u.displayName || "" };
      }
    }
  }
  return map;
}

async function batchFetchPresence(ids: number[]): Promise<Record<number, number>> {
  const map: Record<number, number> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await fetchJson("https://presence.roblox.com/v1/presence/users", {
      method: "POST",
      body: JSON.stringify({ userIds: batch }),
    });
    if (data?.userPresences) {
      for (const p of data.userPresences) {
        map[p.userPresenceType !== undefined ? p.userId : p.userId] = p.userPresenceType ?? 0;
      }
    }
  }
  return map;
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

  const rl = checkRateLimit(ip, { max: 20, windowMs: 10000, store: "roblox-social" });
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

    const rawUsers = data.data || [];
    const userIds: number[] = rawUsers.map((u: any) => u.id || u.userId || u.UserId).filter(Boolean);

    const [usernameMap, presenceMap] = await Promise.all([
      batchFetchUsernames(userIds),
      type === "friends" ? batchFetchPresence(userIds) : Promise.resolve({}),
    ]);

    const users = rawUsers.map((u: any) => {
      const id = u.id || u.userId || u.UserId;
      const name = u.name || u.username || u.userName || usernameMap[id]?.name || "";
      const displayName = u.displayName || u.DisplayName || usernameMap[id]?.displayName || name || `User ${id}`;
      const presenceType = u.presenceType ?? (presenceMap as Record<number, number>)[id] ?? 0;
      return {
        userId: id,
        username: name,
        displayName,
        hasVerifiedBadge: u.hasVerifiedBadge || u.HasVerifiedBadge || false,
        isOnline: presenceType > 0,
        presenceType,
      };
    });

    const thumbIds = users.map((u: any) => u.userId).filter(Boolean);
    let thumbMap: Record<number, string> = {};
    if (thumbIds.length > 0) {
      for (let i = 0; i < thumbIds.length; i += 100) {
        const batch = thumbIds.slice(i, i + 100).join(",");
        const thumbRes = await fetchJson(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${batch}&size=150x150&format=Png&isCircular=false`
        );
        if (thumbRes?.data) {
          for (const t of thumbRes.data) {
            if (t.targetId && t.imageUrl) thumbMap[t.targetId] = t.imageUrl;
          }
        }
      }
    }

    for (const u of users) {
      u.avatarHeadshot = thumbMap[u.userId] || "";
    }

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
