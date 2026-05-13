import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export function isAuthConfigured() {
  return !!(
    process.env.NEXTAUTH_SECRET &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ user }) {
      const allowed =
        process.env.AUTH_ALLOWED_EMAILS?.split(",").map((e) => e.trim()) ?? [];
      if (allowed.length && !allowed.includes(user.email ?? "")) return false;
      return true;
    },
    session({ session, token }) {
      if (session.user) (session.user as any).id = token.sub;
      return session;
    },
  },
};
