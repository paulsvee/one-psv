import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const secret = process.env.NEXTAUTH_SECRET;
const secureCookie = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

export async function getOwnerEmail(req: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({ req, secret, secureCookie });
    return (token?.email as string | undefined) ?? null;
  } catch {
    return null;
  }
}
