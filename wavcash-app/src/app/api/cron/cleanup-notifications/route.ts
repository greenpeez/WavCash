import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/cleanup-notifications
 *
 * Deletes notifications older than 60 days.
 * Triggered via cron schedule (e.g., daily).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServiceClient();
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("notifications")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);

    if (error) {
      console.error("Notification cleanup failed:", error);
      return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }

    return NextResponse.json({
      deleted: count || 0,
      cutoff_date: cutoff,
    });
  } catch (err) {
    console.error("Notification cleanup error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
