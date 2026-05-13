import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getOwnerEmail(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.email ?? null;
  } catch {
    return null;
  }
}
