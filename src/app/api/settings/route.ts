import { NextRequest, NextResponse } from "next/server";
import { getOwnerEmail } from "@/lib/getAuthToken";
import { getNeonAppTitle, setNeonAppTitle } from "@/lib/neon";

export async function GET(req: NextRequest) {
  try {
    const email = await getOwnerEmail(req);
    if (email) {
      const appTitle = await getNeonAppTitle(email);
      return NextResponse.json({ appTitle });
    }
    return NextResponse.json({ appTitle: "One" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const email = await getOwnerEmail(req);
    const { appTitle } = await req.json();
    if (email) await setNeonAppTitle(email, typeof appTitle === "string" ? appTitle : "One");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
