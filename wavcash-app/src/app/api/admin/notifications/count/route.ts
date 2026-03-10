import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";

/**
 * GET /api/admin/notifications/count
 * Returns the count of unread admin notifications.
 */
export async function GET() {
  try {
    const { email } = await verifyAdmin();
    const supabase = await createServiceClient();

    const { count, error } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("admin_email", email.toLowerCase())
      .eq("read", false);

    if (error) {
      return NextResponse.json({ unread: 0 });
    }

    return NextResponse.json({ unread: count || 0 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
