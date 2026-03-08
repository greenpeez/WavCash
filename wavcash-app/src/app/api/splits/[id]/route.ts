import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth();
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data } = await supabase
      .from("splits")
      .select(`
        id, title, status, contract_address, tx_hash, created_at, contract_data, created_by,
        tracks:track_id (title, isrc, album),
        split_contributors (id, email, legal_name, role, percentage, signed, signed_at, invite_token, user_id, slot_index),
        distributions (id, tx_hash, token_type, total_amount, status, created_at),
        split_events (id, event_type, tx_hash, data, created_at)
      `)
      .eq("id", id)
      .single();

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Ownership check: user must be the creator or a linked contributor
    const isCreator = data.created_by === userId;
    const isContributor = (data.split_contributors || []).some(
      (c: { user_id: string | null }) => c.user_id === userId
    );
    if (!isCreator && !isContributor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      status: data.status,
      contract_address: data.contract_address,
      tx_hash: data.tx_hash,
      created_at: data.created_at,
      created_by: data.created_by,
      contract_data: (data as Record<string, unknown>).contract_data as Record<string, unknown> | null,
      track: data.tracks as unknown as { title: string; isrc: string; album: string | null } | null,
      contributors: (data.split_contributors || []) as {
        id: string;
        email: string;
        legal_name: string;
        role: string;
        percentage: number;
        signed: boolean;
        signed_at: string | null;
        invite_token: string | null;
        user_id: string | null;
        slot_index: number | null;
      }[],
      distributions: ((data.distributions || []) as {
        id: string;
        tx_hash: string;
        token_type: string;
        total_amount: string;
        status: string;
        created_at: string;
      }[])
        .filter((d) => d.status === "success")
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      events: ((data.split_events || []) as {
        id: string;
        event_type: string;
        tx_hash: string | null;
        data: Record<string, unknown>;
        created_at: string;
      }[]).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
