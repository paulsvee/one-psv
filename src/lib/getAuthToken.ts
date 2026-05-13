import { decode } from "next-auth/jwt";
import { cookies } from "next/headers";

export async function getOwnerEmail(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const sessionToken = cookieStore.get(cookieName)?.value;
    if (!sessionToken) return null;

    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET ?? "",
    });

    return (decoded?.email as string | undefined) ?? null;
  } catch {
    return null;
  }
}
