import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    const { searchParams } = new URL(request.url);
    const statementId = searchParams.get("statement_id");

    if (!statementId) {
      return NextResponse.json({ error: "statement_id required" }, { status: 400 });
    }

    // Verify ownership of this statement
    const { data: statement } = await supabase
      .from("royalty_statements")
      .select("id")
      .eq("id", statementId)
      .eq("user_id", userId)
      .single();

    if (!statement) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data } = await supabase
      .from("statement_lines")
      .select("*")
      .eq("statement_id", statementId)
      .eq("flagged", true)
      .order("delta_pct", { ascending: false });

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
