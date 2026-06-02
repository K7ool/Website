import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await adminDb.collection("licenseBlacklist").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST_DELETE] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let body: { active?: boolean };
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 }); }
    if (body.active !== undefined) {
      await adminDb.collection("licenseBlacklist").doc(id).update({ active: body.active });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST_TOGGLE] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
