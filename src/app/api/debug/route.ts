import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll().map((c) => c.name);

  return NextResponse.json({
    session: session?.user?.email ?? null,
    cookies: allCookies,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
    },
  });
}
