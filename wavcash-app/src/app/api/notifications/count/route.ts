import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";

/**
 * GET /api/notifications/count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      return NextResponse.json({ unread: 0 });
    }

    return NextResponse.json({ unread: count || 0 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
