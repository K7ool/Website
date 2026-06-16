import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ROBLOX_HEADERS = {
  "User-Agent": "FlippStudios/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...ROBLOX_HEADERS, ...opts?.headers }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return null;
  return res.json();
}

async function fetchUserBatch(ids: number[]): Promise<Record<number, { name: string; displayName: string }>> {
  const map: Record<number, { name: string; displayName: string }> = {};
  const CONCURRENCY = 50;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) =>
        fetchJson(`https://users.roblox.com/v1/users/${id}`).then((d) => ({ id, d }))
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.d?.name) {
        map[r.value.id] = {
          name: r.value.d.name,
          displayName: r.value.d.displayName || r.value.d.name,
        };
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
        map[p.userId] = p.userPresenceType ?? 0;
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

    if (rawUsers.length > 0) {
      console.log("[SOCIAL DEBUG] First raw item keys:", Object.keys(rawUsers[0]));
      console.log("[SOCIAL DEBUG] First raw item:", JSON.stringify(rawUsers[0]));
    }

    const users = rawUsers.map((u: any) => ({
      userId: u.id || u.userId || u.UserId,
      username: u.name || u.username || u.userName || "",
      displayName: u.displayName || u.DisplayName || "",
      hasVerifiedBadge: u.hasVerifiedBadge || u.HasVerifiedBadge || false,
      presenceType: u.presenceType ?? u.PresenceType ?? -1,
    }));

    const missingNameIds = users
      .filter((u: any) => !u.username && !u.displayName)
      .map((u: any) => u.userId)
      .filter(Boolean);

    if (missingNameIds.length > 0) {
      console.log(`[SOCIAL DEBUG] Fetching ${missingNameIds.length} missing usernames individually`);
      const nameMap = await fetchUserBatch(missingNameIds);
      console.log(`[SOCIAL DEBUG] Got ${Object.keys(nameMap).length} usernames back`);
      if (Object.keys(nameMap).length > 0) {
        const firstKey = Object.keys(nameMap)[0];
        console.log(`[SOCIAL DEBUG] Sample: ${firstKey} ->`, JSON.stringify(nameMap[Number(firstKey)]));
      }
      for (const u of users) {
        if (!u.username && !u.displayName && nameMap[u.userId]) {
          u.username = nameMap[u.userId].name;
          u.displayName = nameMap[u.userId].displayName;
        }
        if (!u.displayName && u.username) u.displayName = u.username;
        if (!u.username && u.displayName) u.username = u.displayName;
      }
    }

    const missingPresenceIds = users
      .filter((u: any) => u.presenceType === -1)
      .map((u: any) => u.userId)
      .filter(Boolean);

    if (missingPresenceIds.length > 0 && type === "friends") {
      const presMap = await batchFetchPresence(missingPresenceIds);
      for (const u of users) {
        if (u.presenceType === -1) {
          u.presenceType = presMap[u.userId] ?? 0;
        }
      }
    }

    for (const u of users) {
      if (u.presenceType === -1) u.presenceType = 0;
      if (!u.displayName) u.displayName = `User ${u.userId}`;
      if (!u.username) u.username = u.displayName.toLowerCase().replace(/\s+/g, "_");
    }

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
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Lookup failed" }, { status: 500 });
  }
}
