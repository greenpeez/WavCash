import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await verifyAuth();
    const { id: artistId } = await params;
    const supabase = await createServiceClient();

    // Verify artist belongs to user
    const { data: artist } = await supabase
      .from("artists")
      .select("id")
      .eq("id", artistId)
      .eq("user_id", userId)
      .single();

    if (!artist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("tracks")
      .select("title, isrc, album, album_art_url")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
