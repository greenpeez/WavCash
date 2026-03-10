import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";

/**
 * GET /api/admin/distributions/lookup?isrc=XXXX
 * Look up an active split by ISRC code.
 * Returns split details with contributors and contract address.
 */
export async function GET(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isrc = searchParams.get("isrc")?.trim();

  if (!isrc) {
    return NextResponse.json({ error: "ISRC is required" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Find the track by ISRC
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, title, isrc")
    .eq("isrc", isrc)
    .limit(1);

  if (!tracks || tracks.length === 0) {
    return NextResponse.json(
      { error: "No track found for this ISRC" },
      { status: 404 }
    );
  }

  const track = tracks[0];

  // Find active split(s) for this track
  const { data: splits } = await supabase
    .from("splits")
    .select(
      `id, title, status, contract_address,
       split_contributors (legal_name, role, percentage, wallet_address, user_id)`
    )
    .eq("track_id", track.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!splits || splits.length === 0) {
    return NextResponse.json(
      { error: "No active split found for this ISRC" },
      { status: 404 }
    );
  }

  const split = splits[0];

  return NextResponse.json({
    track: { id: track.id, title: track.title, isrc: track.isrc },
    split: {
      id: split.id,
      title: split.title,
      status: split.status,
      contract_address: split.contract_address,
      contributors: split.split_contributors,
    },
  });
}
