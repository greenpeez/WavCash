import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";
import { reconcileEarnings } from "@/lib/earnings/reconcile";

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const result = await reconcileEarnings(supabase, userId);

    if (!result) {
      return NextResponse.json({ data: null, dataSource: "oracle" });
    }

    return NextResponse.json({ data: result, dataSource: result.dataSource });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
