import { NextRequest, NextResponse } from "next/server";

const ROBLOX_HEADERS = {
  "User-Agent": "FlippStudios/1.0",
  Accept: "application/json",
};

async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...ROBLOX_HEADERS, ...opts?.headers } });
  if (!res.ok) return null;
  return res.json();
}

async function resolveUser(query: string): Promise<{ id: number; name: string } | null> {
  if (/^\d+$/.test(query)) {
    const profile = await fetchJson(`https://users.roblox.com/v1/users/${query}`);
    if (profile?.id) return { id: profile.id, name: profile.name };
    return null;
  }
  const data = await fetchJson("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    body: JSON.stringify({ usernames: [query], excludeBannedUsers: true }),
  });
  if (data?.data?.length) return { id: data.data[0].id, name: data.data[0].name };
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 });
    }

    const resolved = await resolveUser(query.trim());
    if (!resolved) {
      return NextResponse.json({ success: false, error: "Roblox user not found" }, { status: 404 });
    }

    const { id: userId, name: username } = resolved;

    const [profile, thumbHeadshot, thumbFull, games, groups, friendsCount, followersCount, followingCount, badges, collectibles] = await Promise.all([
      fetchJson(`https://users.roblox.com/v1/users/${userId}`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png`),
      fetchJson(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png`),
      fetchJson(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50`),
      fetchJson(`https://groups.roblox.com/v1/users/${userId}/groups/roles`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
      fetchJson(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
      fetchJson(`https://badges.roblox.com/v1/users/${userId}/badges?limit=50`),
      fetchJson(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=50`),
    ]);

    const data = {
      userId,
      username,
      displayName: profile?.displayName || username,
      description: profile?.description || "",
      created: profile?.created,
      profileUrl: `https://www.roblox.com/users/${userId}/profile`,
      avatarHeadshot: thumbHeadshot?.data?.[0]?.imageUrl || "",
      avatarFull: thumbFull?.data?.[0]?.imageUrl || "",
      isBanned: profile?.isBanned || false,
      hasVerifiedBadge: profile?.hasVerifiedBadge || false,
      friendsCount: friendsCount?.count ?? 0,
      followersCount: followersCount?.count ?? 0,
      followingCount: followingCount?.count ?? 0,
      games: (games?.data || []).slice(0, 50),
      groups: (groups?.data || []).map((g: any) => ({
        id: g.group?.id,
        name: g.group?.name,
        emblemUrl: g.group?.emblemUrl,
        role: g.role?.name,
        rank: g.role?.rank,
      })),
      badges: (badges?.data || []).slice(0, 50),
      collectibles: (collectibles?.data || []).slice(0, 50),
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
