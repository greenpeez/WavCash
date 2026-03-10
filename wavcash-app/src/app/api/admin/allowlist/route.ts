import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";

/**
 * GET /api/admin/allowlist
 * List all whitelisted admin emails.
 */
export async function GET() {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("email, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/admin/allowlist
 * Add an email to the allowlist.
 * Body: { email }
 */
export async function POST(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await request.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("admin_allowlist")
    .upsert({ email: email.toLowerCase() }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "Failed to add" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/allowlist
 * Remove an email from the allowlist.
 * Body: { email }
 */
export async function DELETE(request: Request) {
  try {
    const { email: adminEmail } = await verifyAdmin();

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Prevent removing yourself
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("admin_allowlist")
      .delete()
      .eq("email", email.toLowerCase());

    if (error) {
      return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
