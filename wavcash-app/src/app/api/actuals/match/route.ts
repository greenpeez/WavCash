import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { resolveRate } from "@/lib/oracle/rates";
import { calibrateFromStatement } from "@/lib/oracle/calibrate";

export async function POST(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { statement_id } = await request.json();

    if (!statement_id) {
      return NextResponse.json(
        { error: "statement_id is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: statement } = await supabase
      .from("royalty_statements")
      .select("*")
      .eq("id", statement_id)
      .eq("user_id", userId)
      .single();

    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    // Get statement lines
    const { data: lines } = await supabase
      .from("statement_lines")
      .select("*")
      .eq("statement_id", statement_id);

    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: "No lines to match" }, { status: 400 });
    }

    // Get user's tracks
    const { data: artists } = await supabase
      .from("artists")
      .select("id")
      .eq("user_id", userId);

    if (!artists || artists.length === 0) {
      return NextResponse.json({
        matched: 0,
        unmatched: lines.length,
        flagged: 0,
        total_gap: 0,
      });
    }

    const { data: tracks } = await supabase
      .from("tracks")
      .select("id, isrc")
      .in("artist_id", artists.map((a) => a.id));

    const trackMap: Record<string, string> = {};
    for (const t of tracks || []) {
      if (t.isrc) trackMap[t.isrc.toUpperCase()] = t.id;
    }

    // Get user's country for rate resolution
    const { data: userProfile } = await supabase
      .from("users")
      .select("country")
      .eq("id", userId)
      .single();

    const userCountry = userProfile?.country || null;

    let matched = 0;
    let unmatched = 0;
    let flagged = 0;
    let totalGap = 0;

    for (const line of lines) {
      if (!line.isrc) {
        unmatched++;
        continue;
      }

      const trackId = trackMap[line.isrc.toUpperCase()];
      if (!trackId) {
        unmatched++;
        continue;
      }

      matched++;

      // Publisher lines (income_type is set): match by ISRC but skip oracle
      // comparison — publishing royalties aren't comparable to stream-based estimates
      if (line.income_type) {
        await supabase
          .from("statement_lines")
          .update({
            matched_track_id: trackId,
            oracle_estimated: null,
            delta_pct: null,
            flagged: false,
          })
          .eq("id", line.id);
        continue;
      }

      // Distributor lines: full oracle comparison
      const platform = (line.platform || "spotify").toLowerCase().replace(/\s+/g, "_");
      const lineCountry = line.country || userCountry;
      const period = line.period || new Date().toISOString().slice(0, 7);
      const streams = Number(line.streams) || 0;
      const actualEarnings = Number(line.earnings) || 0;

      // Resolve the best available fair market rate
      const resolved = await resolveRate(supabase, platform, lineCountry, period);

      // Calculate oracle estimate using resolved rate × actual streams
      const oracleEstimate = streams > 0 ? streams * resolved.rate : 0;

      let deltaPct = 0;
      if (oracleEstimate > 0) {
        deltaPct = ((oracleEstimate - actualEarnings) / oracleEstimate) * 100;
      }

      const isFlagged = Math.abs(deltaPct) > 15;
      if (isFlagged) {
        flagged++;
        totalGap += oracleEstimate - actualEarnings;
      }

      // Update the line with match data
      await supabase
        .from("statement_lines")
        .update({
          matched_track_id: trackId,
          oracle_estimated: Math.round(oracleEstimate * 100) / 100,
          delta_pct: Math.round(deltaPct * 100) / 100,
          flagged: isFlagged,
        })
        .eq("id", line.id);
    }

    // Update statement status
    await supabase
      .from("royalty_statements")
      .update({ status: "confirmed" })
      .eq("id", statement_id);

    // Trigger rate calibration (non-blocking — runs after response)
    // This creates rate observations and updates community calibrated rates
    let calibration = null;
    try {
      calibration = await calibrateFromStatement(supabase, statement_id, userId);
    } catch (calibrationErr) {
      console.error("Calibration error (non-fatal):", calibrationErr);
    }

    return NextResponse.json({
      matched,
      unmatched,
      flagged,
      total_gap: Math.round(totalGap * 100) / 100,
      calibration: calibration
        ? {
            observations: calibration.observations_created,
            qualified: calibration.qualified,
            flagged_underpayment: calibration.flagged_underpayment,
            rates_updated: calibration.rates_updated,
          }
        : null,
    });
  } catch (err) {
    console.error("Match error:", err);
    return NextResponse.json(
      { error: "Failed to run matching" },
      { status: 500 }
    );
  }
}
