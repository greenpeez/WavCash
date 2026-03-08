import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { generateContractText, generateContractHtml } from "@/lib/contracts/generate";

/**
 * GET /api/splits/[id]/contract?format=text|html
 *
 * Returns the generated contract for a split. Requires authentication.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await verifyAuth();

    const supabase = await createServiceClient();

    // Get split with track, contributors, and contract_data
    const { data: split } = await supabase
      .from("splits")
      .select(`
        id, title, created_by, created_at, contract_data, contract_address, status,
        tracks:track_id(title, isrc),
        split_contributors(legal_name, role, percentage, email, user_id, signed, signed_at)
      `)
      .eq("id", id)
      .single();

    if (!split) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // Ownership check: must be creator or a linked contributor
    const isCreator = split.created_by === userId;
    const isContributor = (split.split_contributors || []).some(
      (c: { user_id: string | null }) => c.user_id === userId
    );
    if (!isCreator && !isContributor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get creator name
    const { data: creator } = await supabase
      .from("users")
      .select("display_name")
      .eq("id", split.created_by)
      .single();

    const track = split.tracks as unknown as { title: string; isrc: string } | null;
    const contributors = (split.split_contributors || []) as Array<{
      legal_name: string;
      role: string;
      percentage: number;
      email: string;
      signed?: boolean;
      signed_at?: string | null;
    }>;

    const contractParams = {
      senderName: creator?.display_name || "Unknown",
      trackTitle: track?.title || split.title,
      trackIsrc: track?.isrc || "N/A",
      contributors,
      date: split.created_at,
      contractData: (split as Record<string, unknown>).contract_data as import("@/lib/types/contract").ContractData | null,
      contractAddress: (split as Record<string, unknown>).contract_address as string | null,
    };

    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "text";

    if (format === "html") {
      const html = generateContractHtml(contractParams);
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const text = generateContractText(contractParams);
    return new Response(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${split.title.replace(/[^a-zA-Z0-9]/g, "_")}_contract.txt"`,
      },
    });
  } catch (err) {
    console.error("Contract generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}
