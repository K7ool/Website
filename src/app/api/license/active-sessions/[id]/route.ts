import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await adminDb.collection("activeSessions").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LICENSE_ACTIVE_SESSIONS_DELETE] Error:", err);
    return NextResponse.json({ success: false, reason: "SERVER_ERROR", error: err.message }, { status: 500 });
  }
}
