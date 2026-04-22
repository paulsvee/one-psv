import { NextRequest, NextResponse } from "next/server";
import { getAppTitle, setAppTitle } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json({ appTitle: getAppTitle() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { appTitle } = await req.json();
    setAppTitle(typeof appTitle === "string" ? appTitle : "One");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
