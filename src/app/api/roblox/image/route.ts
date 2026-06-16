import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "t0.rbxcdn.com",
  "t1.rbxcdn.com",
  "t2.rbxcdn.com",
  "t3.rbxcdn.com",
  "t4.rbxcdn.com",
  "t5.rbxcdn.com",
  "t6.rbxcdn.com",
  "t7.rbxcdn.com",
  "t8.rbxcdn.com",
  "t9.rbxcdn.com",
  "tr.rbxcdn.com",
  "thumbs.roblox.com",
  "games.roblox.com",
  "www.roblox.com",
];

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return new NextResponse("Missing url param", { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return new NextResponse("Invalid URL", { status: 400 });
    }

    // Only allow Roblox CDN hosts
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return new NextResponse("Host not allowed", { status: 403 });
    }

    const imageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": "https://www.roblox.com/",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!imageRes.ok) {
      return new NextResponse("Image fetch failed", { status: 502 });
    }

    const contentType = imageRes.headers.get("content-type") || "image/png";
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy error", { status: 500 });
  }
}
