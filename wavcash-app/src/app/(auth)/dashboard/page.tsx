"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  Music,
  BarChart3,
  Disc3,
  ArrowRight,
  Shield,
  Eye,
} from "lucide-react";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { PlatformDonut } from "@/components/dashboard/platform-donut";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";

type DataSource = "actuals" | "oracle" | "mixed";

interface SummaryData {
  totalEarnings: number;
  masterEarnings: number;
  publishingEarnings: number;
  splitEarnings: number;
  last12Months: number;
  topTrack: { title: string; earnings: number } | null;
  topPlatform: { name: string; percentage: number } | null;
  monthlyData: { month: string; earnings?: number; master: number; publishing: number }[];
  platformData: { platform: string; earnings: number; color: string }[];
  trackCount: number;
  hasData: boolean;
  dataSource: DataSource;
}

interface DashboardData {
  spotifyConnected: boolean;
  summary: SummaryData;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function DataSourceBadge({ source }: { source: DataSource }) {
  if (source === "oracle") {
    return (
      <Badge variant="secondary" className="mt-2 text-[10px]">
        <Eye className="h-3 w-3 mr-1" />
        Oracle Estimate
      </Badge>
    );
  }
  if (source === "mixed") {
    return (
      <Badge variant="secondary" className="mt-2 text-[10px]">
        <Shield className="h-3 w-3 mr-1" />
        Master + Publishing
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="mt-2 text-[10px]">
      <Shield className="h-3 w-3 mr-1" />
      Verified
    </Badge>
  );
}

export default function DashboardPage() {
  const { user: privyUser, ready } = usePrivy();

  const { data, isLoading } = useAuthSWR<DashboardData>(
    privyUser ? `dashboard:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    }
  );

  if (!ready || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // No Spotify connected
  if (!data?.spotifyConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
          <Disc3 className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <h2 className="font-[family-name:var(--font-general-sans)] text-2xl font-bold">
          Connect Spotify to get started
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md">
          We need access to your catalog to start calculating your royalties. Connect Spotify from your settings.
        </p>
        <Link href="/settings">
          <Button className="btn-cta gap-2">
            Go to Settings
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const summary = data?.summary;
  const dataSource = summary?.dataSource || "oracle";
  const isOracle = dataSource === "oracle";
  const hasBreakdown = !isOracle && (summary?.publishingEarnings ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-general-sans)] text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Your royalty intelligence at a glance.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                {isOracle ? "Total Estimated" : "Total Earnings"}
              </p>
              <DollarSign className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <p className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
              {summary?.hasData ? formatCurrency(summary.totalEarnings) : "—"}
            </p>
            {summary?.hasData && <DataSourceBadge source={dataSource} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                Last 12 Months
              </p>
              <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
            </div>
            <p className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold">
              {summary?.hasData ? formatCurrency(summary.last12Months) : "—"}
            </p>
            {hasBreakdown && (
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Master: {formatCurrency(summary?.masterEarnings ?? 0)}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  Publishing: {formatCurrency(summary?.publishingEarnings ?? 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                Top Track
              </p>
              <Music className="h-4 w-4 text-[var(--accent)]" />
            </div>
            {summary?.topTrack ? (
              <>
                <p className="text-sm font-medium truncate">{summary.topTrack.title}</p>
                <p className="font-[family-name:var(--font-jetbrains)] text-lg font-bold mt-1">
                  {formatCurrency(summary.topTrack.earnings)}
                </p>
              </>
            ) : (
              <p className="text-[var(--text-tertiary)]">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                Top Platform
              </p>
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
            </div>
            {summary?.topPlatform ? (
              <>
                <p className="text-sm font-medium">{summary.topPlatform.name}</p>
                <p className="font-[family-name:var(--font-jetbrains)] text-lg font-bold mt-1">
                  {summary.topPlatform.percentage}%
                </p>
              </>
            ) : (
              <p className="text-[var(--text-tertiary)]">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {summary?.hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Monthly Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <EarningsChart
                data={summary.monthlyData}
                hasBreakdown={hasBreakdown}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Split</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformDonut data={summary.platformData} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
        <span>
          <span className="font-[family-name:var(--font-jetbrains)] font-bold text-[var(--text-primary)]">
            {summary?.trackCount || 0}
          </span>{" "}
          tracks in catalog
        </span>
        {(summary?.splitEarnings ?? 0) > 0 && (
          <span>
            <span className="font-[family-name:var(--font-jetbrains)] font-bold text-[var(--text-primary)]">
              {formatCurrency(summary!.splitEarnings)}
            </span>{" "}
            from splits
          </span>
        )}
      </div>
    </div>
  );
}
