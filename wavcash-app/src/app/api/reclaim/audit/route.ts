import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify";
import { createServiceClient } from "@/lib/supabase/server";

interface Recommendation {
  cmo_code: string;
  cmo_name: string;
  priority: "high" | "medium" | "low";
  reason: string;
  estimated_impact?: string;
}

export async function GET() {
  try {
    const { userId } = await verifyAuth();
    const supabase = await createServiceClient();

    // Batch fetch all data we need
    const [userRes, registrationsRes, directoryRes, statementsRes, splitsRes] =
      await Promise.all([
        supabase
          .from("users")
          .select("country, role")
          .eq("id", userId)
          .single(),
        supabase
          .from("cmo_registrations")
          .select("cmo_code, status")
          .eq("user_id", userId),
        supabase.from("cmo_directory").select("*"),
        supabase
          .from("royalty_statements")
          .select("id")
          .eq("user_id", userId),
        supabase
          .from("split_contributors")
          .select("split_id, splits!inner(id, status, contract_data)")
          .eq("user_id", userId),
      ]);

    const userCountry = userRes.data?.country?.toUpperCase() || "";
    const registeredCodes = new Set(
      (registrationsRes.data || []).map((r) => r.cmo_code)
    );
    const cmoDirectory = directoryRes.data || [];
    const cmoByCode: Record<string, (typeof cmoDirectory)[number]> = {};
    for (const c of cmoDirectory) {
      cmoByCode[c.code] = c;
    }

    // Check for statement lines with source_name data (from publisher CSVs)
    let sourceNames: string[] = [];
    if (statementsRes.data && statementsRes.data.length > 0) {
      const stmtIds = statementsRes.data.map((s) => s.id);
      const { data: lines } = await supabase
        .from("statement_lines")
        .select("source_name")
        .in("statement_id", stmtIds)
        .not("source_name", "is", null);

      if (lines) {
        sourceNames = [
          ...new Set(
            lines
              .map((l) => l.source_name?.toLowerCase())
              .filter(Boolean) as string[]
          ),
        ];
      }
    }

    // Check for SoundExchange LoD in active splits
    const hasLodSplits = (splitsRes.data || []).some((c) => {
      const split = (c as Record<string, unknown>).splits as {
        status: string;
        contract_data: Record<string, unknown> | null;
      } | null;
      return (
        split?.status === "active" &&
        split?.contract_data?.soundexchange_lod === true
      );
    });

    const recommendations: Recommendation[] = [];

    // === Global recommendations (all users) ===

    // SoundExchange
    if (!registeredCodes.has("soundexchange")) {
      const note = hasLodSplits
        ? " You already have active split agreements with a SoundExchange Letter of Direction, which covers distribution on those tracks."
        : "";
      recommendations.push({
        cmo_code: "soundexchange",
        cmo_name: "SoundExchange",
        priority: "high",
        reason: `SoundExchange collects digital performance royalties from US radio and webcasting for artists worldwide. Registration is free.${note}`,
      });
    }

    // The MLC
    if (!registeredCodes.has("mlc")) {
      recommendations.push({
        cmo_code: "mlc",
        cmo_name: "The MLC",
        priority: "high",
        reason:
          "The MLC collects mechanical royalties from US streaming (Spotify, Apple Music, etc.) for songwriters worldwide. Registration is free.",
      });
    }

    // PPL
    if (!registeredCodes.has("ppl")) {
      recommendations.push({
        cmo_code: "ppl",
        cmo_name: "PPL",
        priority: "medium",
        reason:
          "PPL collects neighboring rights royalties from UK radio and public performance. Accepts international performers. Registration is free.",
      });
    }

    // === Country-specific recommendations ===

    if (userCountry) {
      const countryCmos = cmoDirectory.filter(
        (c) =>
          c.country?.toUpperCase() === userCountry && !c.accepts_international
      );

      for (const cmo of countryCmos) {
        if (registeredCodes.has(cmo.code)) continue;

        const category = cmo.royalty_category || "performance";
        const categoryLabel =
          category === "performance"
            ? "writer's performance royalties"
            : category === "mechanical"
              ? "mechanical royalties"
              : category === "neighboring_rights"
                ? "neighboring rights royalties"
                : "royalties";

        recommendations.push({
          cmo_code: cmo.code,
          cmo_name: cmo.name,
          priority: category === "performance" ? "high" : "medium",
          reason: `Register with ${cmo.name} to collect ${categoryLabel} in your territory.`,
        });
      }
    }

    // === Self-publishing recommendations ===
    // Only shown if the user is NOT yet registered with the society.
    // The wizard includes a self-publishing step for societies with
    // publisher_registration = true (ASCAP, BMI), so once the user
    // starts a registration, they're already guided through it.

    const publisherCmos = cmoDirectory.filter(
      (c) => c.publisher_registration
    );

    for (const cmo of publisherCmos) {
      const writerRegistered = registeredCodes.has(cmo.code);

      // If the user already has a writer registration (which includes
      // the publisher guidance step in the wizard), skip.
      if (writerRegistered) continue;

      recommendations.push({
        cmo_code: cmo.code,
        cmo_name: cmo.name,
        priority: "medium",
        reason: `Register as your own publisher with ${cmo.name} to collect the publisher's share, an additional 50% of composition royalties that you're currently leaving on the table.`,
      });
    }

    // === CSV-enhanced recommendations ===

    if (sourceNames.length > 0) {
      // If collecting through a publisher intermediary but not registered directly
      for (const source of sourceNames) {
        const matchedCmo = cmoDirectory.find(
          (c) => c.code === source || c.name.toLowerCase() === source
        );
        if (matchedCmo && !registeredCodes.has(matchedCmo.code)) {
          // Don't duplicate if already recommended
          if (!recommendations.some((r) => r.cmo_code === matchedCmo.code)) {
            recommendations.push({
              cmo_code: matchedCmo.code,
              cmo_name: matchedCmo.name,
              priority: "medium",
              reason: `Your publisher is collecting from ${matchedCmo.name} on your behalf and taking a commission. Register directly${matchedCmo.registration_cost === "free" ? " (free)" : ""} through Reclaim to keep the full amount.`,
            });
          }
        }
      }
    }

    // Sort by priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    // Calculate coverage score
    const applicableCmos = new Set<string>();

    // Global societies apply to everyone
    for (const c of cmoDirectory) {
      if (c.accepts_international) applicableCmos.add(c.code);
    }
    // Country societies
    for (const c of cmoDirectory) {
      if (c.country?.toUpperCase() === userCountry && !c.accepts_international) {
        applicableCmos.add(c.code);
      }
    }

    const totalApplicable = applicableCmos.size || 1;
    const registeredApplicable = [...applicableCmos].filter((code) =>
      registeredCodes.has(code)
    ).length;
    const coverageScore = Math.round((registeredApplicable / totalApplicable) * 100);

    return NextResponse.json({
      recommendations,
      registered: [...registeredCodes],
      coverage_score: coverageScore,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
