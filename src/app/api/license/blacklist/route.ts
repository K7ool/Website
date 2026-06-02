import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type");
    const value = req.nextUrl.searchParams.get("value");

    if (type && value) {
      const snap = await adminDb.collection("licenseBlacklist")
        .where("type", "==", type)
        .where("value", "==", value)
        .where("active", "==", true)
        .limit(1)
        .get();
      const blacklisted = !snap.empty;
      return NextResponse.json({ success: true, blacklisted, entry: blacklisted ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null });
    }

    const snap = await adminDb.collection("licenseBlacklist").orderBy("createdAt", "desc").get();
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, entries });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: { type?: string; value?: string; reason?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 }); }

    const { type, value, reason } = body;
    if (!type || !value) return NextResponse.json({ success: false, reason: "MISSING_FIELDS" }, { status: 400 });
    if (!["placeId", "universeId", "userId"].includes(type)) return NextResponse.json({ success: false, reason: "INVALID_TYPE" }, { status: 400 });

    const ref = await adminDb.collection("licenseBlacklist").add({
      type, value, reason: reason || "", active: true, createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
