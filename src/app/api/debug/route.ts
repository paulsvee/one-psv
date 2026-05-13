import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { getOwnerEmail } from "@/lib/getAuthToken";
import { getNeonFolders } from "@/lib/neon";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll().map((c) => c.name);

  const email = await getOwnerEmail();
  let foldersTest: any = null;
  if (email) {
    try {
      const folders = await getNeonFolders(email);
      foldersTest = { count: folders.length, first: folders[0]?.name ?? null };
    } catch (e: any) {
      foldersTest = { error: e.message };
    }
  }

  return NextResponse.json({
    session: session?.user?.email ?? null,
    ownerEmail: email,
    foldersTest,
    cookies: allCookies,
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
    },
  });
}
