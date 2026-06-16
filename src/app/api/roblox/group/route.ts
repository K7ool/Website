import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ROBLOX_HEADERS = { "User-Agent": "FlippStudios/1.0", Accept: "application/json" };

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { headers: ROBLOX_HEADERS, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, { max: 20, windowMs: 60_000, store: "roblox-group" })) {
      return NextResponse.json({ success: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    const groupId = req.nextUrl.searchParams.get("id");
    if (!groupId || !/^\d+$/.test(groupId)) {
      return NextResponse.json({ success: false, error: "Valid group ID is required" }, { status: 400 });
    }

    const [groupInfo, rolesData, membersData] = await Promise.all([
      fetchJson(`https://groups.roblox.com/v1/groups/${groupId}`),
      fetchJson(`https://groups.roblox.com/v1/groups/${groupId}/roles`),
      fetchJson(`https://groups.roblox.com/v1/groups/${groupId}/users?limit=100&sortOrder=Desc`),
    ]);

    if (!groupInfo || groupInfo.errors) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const roles = (rolesData?.roles || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      rank: r.rank,
      memberCount: r.memberCount || 0,
      description: r.description || "",
    }));

    const members = (membersData?.data || []).map((m: any) => ({
      userId: m.user?.userId,
      username: m.user?.username,
      displayName: m.user?.displayName,
      hasVerifiedBadge: m.user?.hasVerifiedBadge || false,
      role: m.role?.name || "",
      rank: m.role?.rank || 0,
      joinedAt: m.joinedAt || "",
    }));

    const owner = groupInfo.owner
      ? {
          userId: groupInfo.owner.userId,
          username: groupInfo.owner.username,
          displayName: groupInfo.owner.displayName,
          hasVerifiedBadge: groupInfo.owner.hasVerifiedBadge || false,
        }
      : null;

    const data = {
      id: groupInfo.id,
      name: groupInfo.name,
      description: groupInfo.description || "",
      owner,
      memberCount: groupInfo.memberCount || 0,
      isBuildersClubOnly: groupInfo.isBuildersClubOnly || false,
      publicEntryAllowed: groupInfo.publicEntryAllowed || false,
      hasVerifiedBadge: groupInfo.hasVerifiedBadge || false,
      isLocked: groupInfo.isLocked || false,
      emblemUrl: groupInfo.emblemUrl || "",
      thumbnailUrl: groupInfo.thumbnailUrl || "",
      roles,
      members,
      totalMembers: membersData?.totalMembers || groupInfo.memberCount || 0,
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json({ success: false, error: "Roblox API timeout" }, { status: 504 });
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
