import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Get split IDs where user is a linked contributor
    const { data: contribRows } = await supabase
      .from("split_contributors")
      .select("split_id")
      .eq("user_id", userId);

    const contribSplitIds = (contribRows || []).map(
      (r: { split_id: string }) => r.split_id
    );

    // Fetch splits where user is creator OR linked contributor
    let query = supabase
      .from("splits")
      .select(`
        id, title, status, created_at, created_by, track_id,
        tracks:track_id (title, isrc),
        split_contributors (legal_name, role, percentage, signed)
      `)
      .order("created_at", { ascending: false });

    if (contribSplitIds.length > 0) {
      query = query.or(
        `created_by.eq.${userId},id.in.(${contribSplitIds.join(",")})`
      );
    } else {
      query = query.eq("created_by", userId);
    }

    const { data: splitsData } = await query;

    if (!splitsData) return NextResponse.json([]);

    const result = splitsData.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      title: s.title as string,
      status: s.status as string,
      created_at: s.created_at as string,
      created_by: s.created_by as string,
      track: s.tracks as { title: string; isrc: string } | null,
      contributors: (s.split_contributors || []) as { legal_name: string; role: string; percentage: number; signed: boolean }[],
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { track_id, title, contributors, contract_data } = await request.json();

    if (!track_id || !title || !contributors?.length) {
      return NextResponse.json(
        { error: "track_id, title, and contributors are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const c of contributors as { email: string }[]) {
      if (!c.email || !emailRegex.test(c.email.trim())) {
        return NextResponse.json(
          { error: `Invalid email: ${c.email}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate emails (after normalization)
    const normalizedEmails = (contributors as { email: string }[]).map(
      (c) => c.email.trim().toLowerCase()
    );
    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      return NextResponse.json(
        { error: "Duplicate contributor email" },
        { status: 400 }
      );
    }

    // Validate shares sum to 100
    const totalShares = contributors.reduce(
      (sum: number, c: { percentage: number }) => sum + c.percentage,
      0
    );
    if (Math.abs(totalShares - 100) > 0.01) {
      return NextResponse.json(
        { error: "Shares must total 100%" },
        { status: 400 }
      );
    }

    // Verify track ownership
    const { data: track } = await supabase
      .from("tracks")
      .select("id, artist_id, artists!inner(user_id)")
      .eq("id", track_id)
      .single();

    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Create split
    const { data: split, error: splitError } = await supabase
      .from("splits")
      .insert({
        created_by: userId,
        track_id,
        title,
        status: "draft",
        ...(contract_data ? { contract_data } : {}),
      })
      .select("id")
      .single();

    if (splitError || !split) {
      console.error("Split creation error:", splitError);
      return NextResponse.json(
        { error: "Failed to create agreement" },
        { status: 500 }
      );
    }

    // Create contributors
    const contributorRows = contributors.map(
      (c: { email: string; legal_name: string; role: string; percentage: number }) => ({
        split_id: split.id,
        email: c.email.trim().toLowerCase(),
        legal_name: c.legal_name,
        role: c.role,
        percentage: c.percentage,
      })
    );

    const { error: contribError } = await supabase
      .from("split_contributors")
      .insert(contributorRows);

    if (contribError) {
      console.error("Contributor creation error:", contribError);
      // Clean up the split
      await supabase.from("splits").delete().eq("id", split.id);
      return NextResponse.json(
        { error: "Failed to add contributors" },
        { status: 500 }
      );
    }

    return NextResponse.json({ split_id: split.id });
  } catch (err) {
    console.error("Split API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
