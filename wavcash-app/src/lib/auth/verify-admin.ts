import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Verifies the caller is authenticated AND their email is in the admin_allowlist.
 * Throws if not authenticated or not an admin.
 */
export async function verifyAdmin(): Promise<{ userId: string; email: string }> {
  const { userId } = await verifyAuth();

  const supabase = await createServiceClient();

  // Get user email
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user?.email) {
    throw new Error("No email on account");
  }

  // Check allowlist
  const { data: allowed } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .single();

  if (!allowed) {
    throw new Error("Not an admin");
  }

  return { userId, email: user.email };
}
