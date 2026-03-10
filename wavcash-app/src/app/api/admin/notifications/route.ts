import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";

/**
 * GET /api/admin/notifications?limit=5
 * Returns recent admin notifications for the authenticated admin.
 */
export async function GET(request: Request) {
  try {
    const { email } = await verifyAdmin();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));

    if (error) {
      console.error("Failed to fetch admin notifications:", error);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PATCH /api/admin/notifications
 * Body: { ids: string[] } or { all: true }
 * Marks admin notifications as read.
 */
export async function PATCH(request: Request) {
  try {
    const { email } = await verifyAdmin();
    const body = await request.json();
    const supabase = await createServiceClient();

    if (body.all) {
      await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("admin_email", email.toLowerCase())
        .eq("read", false);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("admin_email", email.toLowerCase())
        .in("id", body.ids);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
