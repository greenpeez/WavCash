"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import { RegistrationWizard } from "@/components/reclaim/registration-wizard";
import {
  Shield,
  AlertTriangle,
  Globe,
  MapPin,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface CmoEntry {
  code: string;
  name: string;
  country: string;
  website: string | null;
  registration_url: string | null;
  submission_channel: string | null;
  royalty_types: string[];
  required_documents: { type: string; label: string; formats: string[] }[];
  processing_time: string | null;
  notes: string | null;
  region: string | null;
  self_registration: boolean;
  registration_cost: string | null;
  royalty_category: string | null;
  accepts_international: boolean;
  publisher_registration: boolean;
  display_order: number;
}

interface Registration {
  id: string;
  cmo_code: string;
  status: string;
  selected_track_ids: string[];
  documents: Record<string, { name: string; uploaded: boolean }> | null;
  personal_info: Record<string, string>;
  current_step: string;
  created_at: string;
  updated_at: string;
  cmo: CmoEntry | null;
}

interface AuditData {
  recommendations: {
    cmo_code: string;
    cmo_name: string;
    priority: "high" | "medium" | "low";
    reason: string;
    estimated_impact?: string;
  }[];
  registered: string[];
  coverage_score: number;
}

interface DirectoryData {
  global: CmoEntry[];
  local: CmoEntry[];
  otherByRegion: Record<string, CmoEntry[]>;
}

interface UserProfile {
  display_name: string;
  country: string;
  legal_name: string | null;
  email: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  not_started: { label: "Not Started", color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: Clock },
  forms_ready: { label: "Forms Ready", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", icon: BookOpen },
  submitted: { label: "Submitted", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", icon: CheckCircle },
  confirmed: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", icon: XCircle },
};

const REGION_LABELS: Record<string, string> = {
  africa: "Africa",
  latam: "Latin America",
  north_america: "North America",
  europe: "Europe",
  asia_pacific: "Asia Pacific",
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  mechanical: "Mechanical",
  digital_performance: "Digital Performance",
  neighboring_rights: "Neighboring Rights",
};

function CoverageRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-[family-name:var(--font-jetbrains)]">
        {score}%
      </span>
    </div>
  );
}

function CmoCard({
  cmo,
  registered,
  onStartRegistration,
}: {
  cmo: CmoEntry;
  registered: boolean;
  onStartRegistration: (cmo: CmoEntry) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/80 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{cmo.name}</p>
          {cmo.royalty_category && (
            <Badge variant="outline" className="text-[10px]">
              {CATEGORY_LABELS[cmo.royalty_category] || cmo.royalty_category}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-[var(--text-tertiary)]">
            {cmo.country}
          </span>
          {cmo.registration_cost && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {cmo.registration_cost}
            </span>
          )}
          {cmo.processing_time && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {cmo.processing_time}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {cmo.website && (
          <a
            href={cmo.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {registered ? (
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
            <CheckCircle className="h-3 w-3 mr-1" />
            Registered
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStartRegistration(cmo)}
            className="text-xs"
          >
            Start Registration
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ReclaimPage() {
  const { user: privyUser, ready } = usePrivy();
  const [wizardCmo, setWizardCmo] = useState<CmoEntry | null>(null);
  const [wizardExistingReg, setWizardExistingReg] = useState<Registration | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});

  const { data: userProfile } = useAuthSWR<UserProfile>(
    privyUser ? `reclaim-profile:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/user");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    }
  );

  const { data: registrations, mutate: mutateRegistrations } = useAuthSWR<Registration[]>(
    privyUser ? `reclaim-registrations:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/reclaim/registrations");
      if (!res.ok) throw new Error("Failed to load registrations");
      return res.json();
    }
  );

  const { data: audit, mutate: mutateAudit } = useAuthSWR<AuditData>(
    privyUser ? `reclaim-audit:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/reclaim/audit");
      if (!res.ok) throw new Error("Failed to load audit");
      return res.json();
    }
  );

  const { data: directory } = useAuthSWR<DirectoryData>(
    privyUser && userProfile
      ? `reclaim-directory:${privyUser.id}:${userProfile.country}`
      : null,
    async () => {
      const res = await authFetch(
        `/api/reclaim/directory?country=${userProfile?.country || ""}`
      );
      if (!res.ok) throw new Error("Failed to load directory");
      return res.json();
    }
  );

  const registeredCodes = new Set(
    (registrations || [])
      .filter((r) => r.status !== "not_started")
      .map((r) => r.cmo_code)
  );

  function toggleRegion(region: string) {
    setExpandedRegions((prev) => ({
      ...prev,
      [region]: !prev[region],
    }));
  }

  function handleWizardComplete() {
    setWizardCmo(null);
    setWizardExistingReg(null);
    mutateRegistrations();
    mutateAudit();
  }

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const highPriorityCount =
    audit?.recommendations.filter((r) => r.priority === "high").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-general-sans)] text-2xl font-bold tracking-tight">
          Reclaim
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Register with collection societies to claim every royalty you&apos;re owed.
        </p>
      </div>

      {/* Audit Banner */}
      {audit && highPriorityCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <CoverageRing score={audit.coverage_score} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">
                    You may be missing royalties from {highPriorityCount}{" "}
                    {highPriorityCount === 1 ? "society" : "societies"}
                  </p>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Your royalty coverage score is {audit.coverage_score}%. Register
                  with the recommended societies below to collect your full earnings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {audit && audit.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--accent)]" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.recommendations.map((rec) => (
              <div
                key={rec.cmo_code}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-surface)]"
              >
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 mt-0.5 ${
                    rec.priority === "high"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : rec.priority === "medium"
                        ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                        : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30"
                  }`}
                >
                  {rec.priority}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{rec.cmo_name}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {rec.reason}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Your Registrations */}
      {registrations && registrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {registrations.map((reg) => {
              const config = STATUS_CONFIG[reg.status] || STATUS_CONFIG.not_started;
              const StatusIcon = config.icon;
              return (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {reg.cmo?.name || reg.cmo_code}
                        </p>
                        {reg.cmo?.country && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {reg.cmo.country}
                          </span>
                        )}
                      </div>
                      {reg.cmo?.royalty_category && (
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {CATEGORY_LABELS[reg.cmo.royalty_category] ||
                            reg.cmo.royalty_category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${config.color}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {(reg.status === "not_started" ||
                      reg.status === "in_progress") &&
                      reg.cmo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setWizardExistingReg(reg);
                            setWizardCmo(reg.cmo!);
                          }}
                          className="text-xs"
                        >
                          Continue
                        </Button>
                      )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Global Royalties */}
      {directory && directory.global.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--accent)]" />
              Global Royalties
            </CardTitle>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              These societies collect royalties from US and UK usage for artists
              worldwide. Any artist on Spotify or Apple Music has streams in
              these territories.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {directory.global.map((cmo) => (
              <CmoCard
                key={cmo.code}
                cmo={cmo}
                registered={registeredCodes.has(cmo.code)}
                onStartRegistration={setWizardCmo}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Local Societies */}
      {directory && directory.local.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
              Societies in Your Country
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {directory.local.map((cmo) => (
              <CmoCard
                key={cmo.code}
                cmo={cmo}
                registered={registeredCodes.has(cmo.code)}
                onStartRegistration={setWizardCmo}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Territories */}
      {directory &&
        Object.keys(directory.otherByRegion).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other Territories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(directory.otherByRegion).map(
                ([region, cmos]) => (
                  <div key={region}>
                    <button
                      onClick={() => toggleRegion(region)}
                      className="flex items-center gap-2 w-full py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {expandedRegions[region] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {REGION_LABELS[region] || region}
                      <span className="text-xs text-[var(--text-tertiary)]">
                        ({cmos.length})
                      </span>
                    </button>
                    {expandedRegions[region] && (
                      <div className="space-y-2 ml-6 mt-1">
                        {cmos.map((cmo) => (
                          <CmoCard
                            key={cmo.code}
                            cmo={cmo}
                            registered={registeredCodes.has(cmo.code)}
                            onStartRegistration={setWizardCmo}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}

      {/* Registration Wizard */}
      {wizardCmo && (
        <RegistrationWizard
          cmo={wizardCmo}
          existingRegistration={wizardExistingReg}
          onClose={() => {
            setWizardCmo(null);
            setWizardExistingReg(null);
            mutateRegistrations();
            mutateAudit();
          }}
          onComplete={handleWizardComplete}
          userProfile={userProfile || null}
        />
      )}
    </div>
  );
}
