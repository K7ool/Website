import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const filePath = path.join(process.cwd(), "ROBLOX", "LicenseService.lua");
    let source = fs.readFileSync(filePath, "utf-8");

    const origin = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${origin}/api/license`;

    source = source.replace("PRODUCT_ID_PLACEHOLDER", productId || "CHANGE_ME");
    source = source.replace("API_BOOTSTRAP_URL", `${baseUrl}/bootstrap`);

    return new NextResponse(source, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
