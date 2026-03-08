import { headers } from "next/headers";
import { getPrivyClient } from "@/lib/privy/server";

export async function verifyAuth(): Promise<{ userId: string }> {
  // Require Bearer token from Authorization header.
  // Never fall back to cookies — stale Privy cookies can persist across
  // logout/login cycles, causing session leakage between users.
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Not authenticated");
  }

  const token = authHeader.slice(7);
  const privy = getPrivyClient();
  const claims = await privy.utils().auth().verifyAuthToken(token);

  return { userId: claims.user_id };
}
