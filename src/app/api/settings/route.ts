import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNeonAppTitle, setNeonAppTitle } from "@/lib/neon";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const appTitle = await getNeonAppTitle(session.user.email);
      return NextResponse.json({ appTitle });
    }
    return NextResponse.json({ appTitle: "One" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { appTitle } = await req.json();
    if (session?.user?.email) {
      await setNeonAppTitle(session.user.email, typeof appTitle === "string" ? appTitle : "One");
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
