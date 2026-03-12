import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { parseStatementCsv, isPublisherSource } from "@/lib/csv/parser";

export async function POST(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const distributor = formData.get("distributor") as string;

    if (!file || !distributor) {
      return NextResponse.json(
        { error: "File and distributor are required" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const { lines, errors } = parseStatementCsv(csvText, distributor);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "No valid data rows found in the file. Check the file format." },
        { status: 400 }
      );
    }

    // Determine period range
    const periods = lines
      .map((l) => l.period)
      .filter(Boolean)
      .sort();
    const periodStart = periods[0] || null;
    const periodEnd = periods[periods.length - 1] || null;

    const totalEarnings = lines.reduce(
      (sum, l) => sum + (l.earnings || 0),
      0
    );

    // Determine statement type (publisher vs distributor)
    const statementType = isPublisherSource(distributor) ? "publisher" : "distributor";

    // Create statement record
    const { data: statement, error: stmtError } = await supabase
      .from("royalty_statements")
      .insert({
        user_id: userId,
        distributor,
        statement_type: statementType,
        upload_filename: file.name,
        period_start: periodStart,
        period_end: periodEnd,
        total_earnings: Math.round(totalEarnings * 100) / 100,
        status: "parsed",
      })
      .select()
      .single();

    if (stmtError || !statement) {
      return NextResponse.json(
        { error: "Failed to create statement record" },
        { status: 500 }
      );
    }

    // Insert line items (publisher fields will be null for distributor CSVs)
    const lineRows = lines.map((l) => ({
      statement_id: statement.id,
      isrc: l.isrc,
      track_title: l.track_title,
      platform: l.platform,
      streams: l.streams,
      earnings: l.earnings,
      period: l.period,
      country: l.country,
      income_type: l.income_type,
      source_name: l.source_name,
      iswc: l.iswc,
      share_received: l.share_received,
      gross_earnings: l.gross_earnings,
    }));

    const { error: linesError } = await supabase
      .from("statement_lines")
      .insert(lineRows);

    if (linesError) {
      console.error("Failed to insert statement lines:", linesError);
      // Clean up the orphaned statement record
      await supabase.from("royalty_statements").delete().eq("id", statement.id);
      return NextResponse.json(
        { error: "Failed to save statement line items. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      statement_id: statement.id,
      lines_count: lines.length,
      total_earnings: totalEarnings,
      period_start: periodStart,
      period_end: periodEnd,
      parse_errors: errors,
      preview: lines.slice(0, 20),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
