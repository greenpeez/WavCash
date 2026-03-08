import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { getPrivyUserInfo } from "@/lib/privy/user-info";

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const body = await request.json();
    const supabase = await createServiceClient();

    // Build update data — only include fields that are explicitly provided
    // so we don't overwrite existing wallet_address or WavCash ID with null
    const updateData: Record<string, unknown> = { id: userId };
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.distributor !== undefined) updateData.distributor = body.distributor || null;
    if (body.wallet_address) updateData.wallet_address = body.wallet_address;
    if (body.legal_name !== undefined) updateData.legal_name = body.legal_name || null;
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url || null;

    // Always ensure email + phone are persisted from Privy
    // (the register route may have failed on first login, leaving these null)
    const privyInfo = await getPrivyUserInfo(userId);
    if (privyInfo.email) updateData.email = privyInfo.email;
    if (privyInfo.phone) updateData.phone = privyInfo.phone;

    const { data, error } = await supabase
      .from("users")
      .upsert(updateData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
