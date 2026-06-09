import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, { max: 30, windowMs: 60_000, store: "roblox-avatars" })) {
      return NextResponse.json({ success: false, error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }

    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ success: false, error: "userIds array is required" }, { status: 400 });
    }

    // Limit to 100 user IDs per request to be safe with Roblox API
    const idsToFetch = userIds.slice(0, 100);

    const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${idsToFetch.join(',')}&size=150x150&format=Png&isCircular=true`, {
      headers: {
        "User-Agent": "FlippStudios/1.0",
        "Accept": "application/json"
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Failed to fetch from Roblox" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
