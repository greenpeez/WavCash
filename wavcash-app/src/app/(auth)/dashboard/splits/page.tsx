"use client";

import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileSignature, Users, Clock } from "lucide-react";
import Link from "next/link";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";

interface SplitWithDetails {
  id: string;
  title: string;
  status: string;
  created_at: string;
  track: { title: string; isrc: string } | null;
  contributors: { legal_name: string; role: string; percentage: number; signed: boolean }[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  awaiting_signatures: { label: "Awaiting Signatures", variant: "outline" },
  active: { label: "Active", variant: "default" },
  voided: { label: "Voided", variant: "destructive" },
};

export default function SplitsPage() {
  const { user: privyUser, ready } = usePrivy();

  const { data: splits = [], isLoading } = useAuthSWR<SplitWithDetails[]>(
    privyUser ? `splits:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/splits");
      if (!res.ok) throw new Error("Failed to load splits");
      return res.json();
    }
  );

  if (!ready || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Splits</h1>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Splits</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Create and manage royalty split agreements
          </p>
        </div>
        <Link href="/dashboard/splits/new">
          <Button className="btn-cta">
            <Plus className="w-4 h-4 mr-2" />
            New Agreement
          </Button>
        </Link>
      </div>

      {splits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)] text-center">
              No agreements yet. Create your first split agreement to define how royalties are shared.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {splits.map((split) => {
            const config = statusConfig[split.status] || statusConfig.draft;
            const signedCount = split.contributors.filter((c) => c.signed).length;
            const totalContributors = split.contributors.length;

            return (
              <Link key={split.id} href={`/dashboard/splits/${split.id}`} className="block">
                <Card className="hover:border-[var(--color-amber)]/30 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{split.title}</span>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        {split.track && (
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {split.track.title} · {split.track.isrc}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>
                            {signedCount}/{totalContributors} signed
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(split.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
