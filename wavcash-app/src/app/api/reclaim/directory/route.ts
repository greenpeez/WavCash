import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await verifyAuth();
    const supabase = await createServiceClient();

    const country = request.nextUrl.searchParams.get("country") || "";

    const { data: entries, error } = await supabase
      .from("cmo_directory")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to load directory" }, { status: 500 });
    }

    // Group into: global (accepts_international), local (user's country), other
    const global = (entries || []).filter((e) => e.accepts_international);
    const local = (entries || []).filter(
      (e) => !e.accepts_international && e.country?.toUpperCase() === country.toUpperCase()
    );
    const other = (entries || []).filter(
      (e) => !e.accepts_international && e.country?.toUpperCase() !== country.toUpperCase()
    );

    // Group "other" by region
    const otherByRegion: Record<string, typeof other> = {};
    for (const entry of other) {
      const region = entry.region || "other";
      if (!otherByRegion[region]) otherByRegion[region] = [];
      otherByRegion[region].push(entry);
    }

    return NextResponse.json({ global, local, otherByRegion });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
