import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";

/**
 * GET /api/notifications?limit=5
 * Returns recent notifications for the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));

    if (error) {
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * PATCH /api/notifications
 * Body: { ids: string[] } or { all: true }
 * Marks notifications as read.
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const body = await request.json();
    const supabase = await createServiceClient();

    if (body.all) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .in("id", body.ids);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
