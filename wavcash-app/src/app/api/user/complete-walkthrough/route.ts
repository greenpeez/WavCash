import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/user/complete-walkthrough
 *
 * Marks the user's walkthrough as complete so it never shows again.
 */
export async function POST() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from("users")
      .update({ walkthrough_complete: true })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
