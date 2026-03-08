import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/user/lookup-by-email?email=xxx
 *
 * Returns the legal_name registered to a given email, if any.
 * Used by the splits wizard to detect name mismatches when adding contributors.
 * Only returns legal_name — no other user data exposed.
 */
export async function GET(request: Request) {
  try {
    await verifyAuth();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ legal_name: null });
    }

    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("users")
      .select("legal_name")
      .ilike("email", email)
      .single();

    return NextResponse.json({ legal_name: data?.legal_name || null });
  } catch {
    return NextResponse.json({ legal_name: null });
  }
}
