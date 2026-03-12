import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { data: registrations, error } = await supabase
      .from("cmo_registrations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("cmo_registrations select failed:", error);
      return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 });
    }

    // Join with cmo_directory data for display
    const cmoCodes = (registrations || []).map((r) => r.cmo_code);
    const { data: cmoEntries } = await supabase
      .from("cmo_directory")
      .select("*")
      .in("code", cmoCodes.length > 0 ? cmoCodes : ["__none__"]);

    const cmoMap: Record<string, (typeof cmoEntries extends (infer T)[] | null ? T : never)> = {};
    for (const entry of cmoEntries || []) {
      cmoMap[entry.code] = entry;
    }

    const enriched = (registrations || []).map((r) => ({
      ...r,
      cmo: cmoMap[r.cmo_code] || null,
    }));

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const body = await request.json();
    const { cmo_code } = body;

    if (!cmo_code) {
      return NextResponse.json({ error: "cmo_code is required" }, { status: 400 });
    }

    // Verify CMO exists and get its ID
    const { data: cmo } = await supabase
      .from("cmo_directory")
      .select("id, code")
      .eq("code", cmo_code)
      .single();

    if (!cmo) {
      return NextResponse.json({ error: "Unknown CMO code" }, { status: 400 });
    }

    // Check for existing registration
    const { data: existing } = await supabase
      .from("cmo_registrations")
      .select("id")
      .eq("user_id", userId)
      .eq("cmo_code", cmo_code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a registration for this society" },
        { status: 409 }
      );
    }

    const { data: registration, error } = await supabase
      .from("cmo_registrations")
      .insert({
        user_id: userId,
        cmo_id: cmo.id,
        cmo_code,
        status: "not_started",
        current_step: "info",
      })
      .select()
      .single();

    if (error) {
      console.error("cmo_registrations insert failed:", error);
      return NextResponse.json(
        { error: "Failed to create registration", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(registration);
  } catch (err) {
    console.error("POST /api/reclaim/registrations error:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const body = await request.json();
    const { id, status, documents, personal_info, notes, selected_track_ids, submission_date, current_step } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Only update provided fields
    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (documents !== undefined) updates.documents = documents;
    if (personal_info !== undefined) updates.personal_info = personal_info;
    if (notes !== undefined) updates.notes = notes;
    if (selected_track_ids !== undefined) updates.selected_track_ids = selected_track_ids;
    if (submission_date !== undefined) updates.submission_date = submission_date;
    if (current_step !== undefined) updates.current_step = current_step;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: registration, error } = await supabase
      .from("cmo_registrations")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !registration) {
      console.error("cmo_registrations update failed:", error);
      return NextResponse.json(
        { error: "Failed to update registration", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
