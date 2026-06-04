import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }
    await sendEmail(to, subject, html);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[EMAIL_API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
