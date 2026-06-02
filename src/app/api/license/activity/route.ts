import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    let body: { licenseKey?: string; licenseId?: string; userId?: string; type?: string; details?: Record<string, any> };
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 }); }

    const { licenseKey, licenseId, userId, type, details } = body;
    if (!type) return NextResponse.json({ success: false, reason: "MISSING_TYPE" }, { status: 400 });

    await adminDb.collection("licenseActivity").add({
      licenseKey: licenseKey || null,
      licenseId: licenseId || null,
      userId: userId || null,
      type,
      details: details || {},
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_ACTIVITY] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
