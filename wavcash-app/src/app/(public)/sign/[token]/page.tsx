"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, FileSignature, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { authFetch } from "@/lib/auth/client";

const MercuryCanvas = dynamic(
  () => import("@/components/dashboard/mercury-canvas"),
  { ssr: false }
);
const AtomCursor = dynamic(
  () => import("@/components/dashboard/atom-cursor"),
  { ssr: false }
);

/* ================================================================
   SCOPED CSS — Sign Page
   Mercury surface background with interactive hover effects.
   ================================================================ */
const SIGN_CSS = `
/* ---- Layout ---- */
.sign-root, .sign-root * { cursor: none !important; }
.sign-root {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}
.sign-overlay {
  position: relative;
  z-index: 10;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

/* ---- Cards — standard theme styling with hover lift ---- */
.sign-root [data-slot="card"] {
  transition: transform 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease !important;
}
.sign-root [data-slot="card"]:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 136, 58, 0.35) !important;
  box-shadow: 0 4px 20px rgba(212, 136, 58, 0.08);
}

/* ---- Buttons ---- */
.sign-root button {
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, border-color 0.5s ease;
}
.sign-root button:hover:not(:disabled) {
  box-shadow: 0 4px 20px rgba(212, 136, 58, 0.15), 0 0 0 1px rgba(212, 136, 58, 0.1);
}
.sign-root button:active:not(:disabled) {
  transform: scale(0.97);
}

/* ---- CTA button ---- */
.sign-root .sign-cta {
  background: #fff;
  color: #000;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  padding: 14px 32px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(255,255,255,0.1);
  transition: transform 0.5s ease, box-shadow 0.5s ease, background 0.4s ease, color 0.4s ease !important;
}
.sign-root .sign-cta:hover:not(:disabled) {
  background: #D4883A !important;
  color: #000 !important;
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 20px rgba(212,136,58,0.25), 0 0 0 1px rgba(212,136,58,0.15) !important;
}
.sign-root .sign-cta:active:not(:disabled) {
  transform: scale(0.98) !important;
}
.sign-root .sign-cta:disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
}
:root.light .sign-root .sign-cta,
.light .sign-root .sign-cta {
  background: #1A1A1A;
  color: #F8F6F3;
}
:root.light .sign-root .sign-cta:hover:not(:disabled),
.light .sign-root .sign-cta:hover:not(:disabled) {
  background: #D4883A !important;
  color: #000 !important;
}

/* ---- Badges ---- */
.sign-root [data-slot="badge"] {
  transition: transform 0.3s ease;
}
.sign-root [data-slot="badge"]:hover {
  transform: scale(1.05);
}

/* ---- Links ---- */
.sign-root a {
  transition: color 0.5s ease;
}
.sign-root a:hover {
  color: #D4883A;
}

/* ---- Loading skeleton ---- */
.sign-root .sign-skeleton {
  background: var(--bg-surface);
  border-radius: 16px;
}
`;

interface SigningData {
  split: {
    id: string;
    title: string;
    status: string;
    contract_address: string | null;
    track: { title: string; isrc: string } | null;
    created_at: string;
  };
  contributor: {
    id: string;
    legal_name: string;
    role: string;
    percentage: number;
    signed: boolean;
  };
  all_contributors: {
    legal_name: string;
    role: string;
    percentage: number;
    signed: boolean;
  }[];
  requires_auth: boolean;
}

const EXPLORER_URL =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114"
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";

export default function SignPage() {
  const params = useParams();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [data, setData] = useState<SigningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function loadSigningData() {
      try {
        const res = await fetch(`/api/sign/${params.token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Invalid or expired link");
          return;
        }
        const signingData = await res.json();
        setData(signingData);
      } catch {
        setError("Failed to load agreement");
      } finally {
        setLoading(false);
      }
    }
    loadSigningData();
  }, [params.token]);

  // Authenticated users: link to contributor record and redirect straight to split detail
  useEffect(() => {
    if (!ready || !data || redirecting) return;
    if (authenticated && data.split?.id) {
      setRedirecting(true);
      authFetch(`/api/sign/${params.token}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then(res => res.ok ? res.json() : null)
        .then(result => {
          router.push(`/dashboard/splits/${result?.split_id || data.split.id}`);
        })
        .catch(() => {
          router.push(`/dashboard/splits/${data.split.id}`);
        });
    }
  }, [ready, authenticated, data, redirecting, router, params.token]);

  const handleReviewDocument = () => {
    if (redirecting) return;
    if (authenticated && data?.split?.id) {
      setRedirecting(true);
      authFetch(`/api/sign/${params.token}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then(res => res.ok ? res.json() : null)
        .then(result => {
          router.push(`/dashboard/splits/${result?.split_id || data.split.id}`);
        })
        .catch(() => {
          router.push(`/dashboard/splits/${data.split.id}`);
        });
    } else {
      // Redirect to login with sign_token so user goes through signup → onboarding → dashboard
      router.push(`/login?sign_token=${params.token}`);
    }
  };

  /* ---- Determine content based on state ---- */
  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className="sign-skeleton h-64 w-full max-w-md rounded-lg animate-pulse" />
    );
  } else if (error || !data) {
    content = (
      <Card className="max-w-md w-full mx-4">
        <CardContent className="py-8 text-center">
          <FileSignature className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">
            {error || "Agreement not found"}
          </p>
        </CardContent>
      </Card>
    );
  } else {
    const { split, contributor, all_contributors } = data;
    content = (
      <div className="max-w-lg w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs text-[var(--color-amber)] font-medium tracking-wider uppercase">
            Powered by WavCash
          </p>
          <h1 className="text-xl font-semibold">{split.title}</h1>
          {split.track && (
            <p className="text-sm text-[var(--text-tertiary)]">
              {split.track.title} · {split.track.isrc}
            </p>
          )}
        </div>

        {/* Your share */}
        <Card className="border-[var(--color-amber)]/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Your share</p>
                <p className="text-sm font-medium">{contributor.legal_name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{contributor.role}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold font-[family-name:var(--font-jetbrains)] text-[var(--color-amber)]">
                  {contributor.percentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All contributors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">All Contributors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {all_contributors.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  {c.signed ? (
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-[var(--border-subtle)]" />
                  )}
                  <span className={c.legal_name === contributor.legal_name ? "font-medium" : ""}>
                    {c.legal_name}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{c.role}</span>
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-xs">
                  {c.percentage}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Verified record (when active with contract) */}
        {split.status === "active" && split.contract_address && (
          <Card className="border-emerald-600/30 dark:border-emerald-500/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    Verified Record
                  </span>
                </div>
                <a
                  href={`${EXPLORER_URL}/address/${split.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]"
                >
                  View Record <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action — always route to login/dashboard, never sign here */}
        {contributor.signed ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              You have signed this agreement
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {all_contributors.filter((c) => c.signed).length}/{all_contributors.length}{" "}
              signatures collected
            </p>
          </div>
        ) : split.status === "voided" ? (
          <div className="text-center py-4">
            <Badge variant="destructive">This agreement has been voided</Badge>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleReviewDocument}
              disabled={!ready || redirecting}
              className="sign-cta"
            >
              {redirecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4" />
                  Review Document
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-[10px] text-center text-[var(--text-tertiary)]">
          By signing, you agree to the royalty split percentages outlined above.
          This agreement is recorded as a permanent, verified record.
        </p>
      </div>
    );
  }

  return (
    <div className="sign-root">
      <style>{SIGN_CSS}</style>
      <MercuryCanvas />
      <AtomCursor />
      <div className="sign-overlay">
        {content}
      </div>
    </div>
  );
}
