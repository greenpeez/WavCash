import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { getPrivyUserInfo } from "@/lib/privy/user-info";

/**
 * Verifies the caller is authenticated AND their email is in the admin_allowlist.
 * Gets email directly from Privy — admins don't need a row in the users table.
 * Throws if not authenticated or not an admin.
 */
export async function verifyAdmin(): Promise<{ userId: string; email: string }> {
  const { userId } = await verifyAuth();

  // Get email directly from Privy, not the users table.
  // This decouples admin auth from the user-facing system.
  const { email } = await getPrivyUserInfo(userId);

  if (!email) {
    throw new Error("No email on Privy account");
  }

  // Check allowlist
  const supabase = await createServiceClient();
  const { data: allowed } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", email.toLowerCase())
    .single();

  if (!allowed) {
    throw new Error("Not an admin");
  }

  return { userId, email };
}
