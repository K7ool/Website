import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await adminDb.collection("licenseBlacklist").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST_DELETE] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let body: { active?: boolean };
    try { body = await req.json(); } catch { return NextResponse.json({ success: false, reason: "INVALID_BODY" }, { status: 400 }); }
    if (body.active !== undefined) {
      await adminDb.collection("licenseBlacklist").doc(params.id).update({ active: body.active });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_BLACKLIST_TOGGLE] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
