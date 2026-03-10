import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";

/**
 * GET /api/admin/data-requests
 * List all data requests, ordered by received_at desc.
 */
export async function GET() {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("data_requests")
    .select("*")
    .order("received_at", { ascending: false });

  if (error) {
    console.error("Failed to list data requests:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/data-requests
 * Update a data request's fields.
 * Body: { id, status?, request_type?, sender_name? }
 */
export async function PATCH(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, request_type, sender_name } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (request_type) updates.request_type = request_type;
  if (sender_name !== undefined) updates.sender_name = sender_name;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("data_requests")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Failed to update data request:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
