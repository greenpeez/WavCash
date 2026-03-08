"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useEnsureEmbeddedWallet } from "@/lib/hooks/use-ensure-embedded-wallet";
import { useSignSplit } from "@/lib/hooks/use-sign-split";
import { authFetch } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileSignature,
  FileText,
  Link as LinkIcon,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const EXPLORER_URL =
  process.env.NEXT_PUBLIC_CHAIN_ID === "43114"
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";

interface SplitDetail {
  id: string;
  title: string;
  status: string;
  contract_address: string | null;
  tx_hash: string | null;
  created_at: string;
  created_by: string;
  contract_data: Record<string, unknown> | null;
  track: { title: string; isrc: string; album: string | null } | null;
  contributors: {
    id: string;
    email: string;
    legal_name: string;
    role: string;
    percentage: number;
    signed: boolean;
    signed_at: string | null;
    invite_token: string | null;
    user_id: string | null;
    slot_index: number | null;
  }[];
  distributions: {
    id: string;
    tx_hash: string;
    token_type: string;
    total_amount: string;
    status: string;
    created_at: string;
  }[];
  events: {
    id: string;
    event_type: string;
    tx_hash: string | null;
    data: Record<string, unknown>;
    created_at: string;
  }[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  awaiting_signatures: { label: "Awaiting Signatures", variant: "outline" },
  active: { label: "Verified Record", variant: "default" },
  voided: { label: "Voided", variant: "destructive" },
};

// ── Activity timeline badge config ──────────────────────────────────
const eventBadgeConfig: Record<string, { label: string; className: string }> = {
  deployed:  { label: "DEPLOYED",  className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  signed:    { label: "SIGNED",    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  activated: { label: "ACTIVATED", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  voided:    { label: "VOIDED",    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  payment:   { label: "PAYMENT",   className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

export default function SplitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { walletAddress } = useEnsureEmbeddedWallet();
  const { signSplit, signing, error: signError } = useSignSplit();
  const [split, setSplit] = useState<SplitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [publisherAcknowledged, setPublisherAcknowledged] = useState(false);

  useEffect(() => {
    loadSplit();
  }, [params.id]);

  async function loadSplit() {
    try {
      const res = await authFetch(`/api/splits/${params.id}`);
      if (!res.ok) {
        setSplit(null);
        setLoading(false);
        return;
      }
      setSplit(await res.json());
    } catch {
      setSplit(null);
    }
    setLoading(false);
  }

  const isCreator = privyUser?.id === split?.created_by;

  const sendForSignatures = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/splits/${params.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send");
      toast.success("Sent for signatures — copy signing links below");
      await loadSplit();
    } catch {
      toast.error("Failed to send for signatures");
    }
    setActionLoading(false);
  };

  const voidSplit = async () => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/splits/${params.id}/void`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to void");
      toast.success("Agreement voided");
      await loadSplit();
    } catch {
      toast.error("Failed to void agreement");
    }
    setActionLoading(false);
  };

  // Auto-open contract if navigated with ?view=contract
  useEffect(() => {
    if (searchParams.get("view") === "contract" && split && !contractHtml && !contractLoading) {
      viewContract();
    }
  }, [searchParams, split]);

  const viewContract = async () => {
    if (contractHtml) {
      setContractHtml(null); // toggle off
      return;
    }
    setContractLoading(true);
    try {
      const res = await authFetch(`/api/splits/${params.id}/contract?format=html`);
      if (!res.ok) throw new Error();
      const html = await res.text();
      setContractHtml(html);
    } catch {
      toast.error("Failed to load contract");
    }
    setContractLoading(false);
  };

  const downloadContract = async () => {
    try {
      const res = await authFetch(`/api/splits/${params.id}/contract?format=html`);
      if (!res.ok) throw new Error();
      const html = await res.text();
      const html2pdf = (await import("html2pdf.js")).default;
      const container = document.createElement("div");
      container.innerHTML = html;
      container.style.maxWidth = "680px";
      container.style.margin = "0 auto";
      container.style.padding = "32px 24px 48px";
      container.style.fontFamily = "'Plus Jakarta Sans', -apple-system, sans-serif";
      container.style.fontSize = "13px";
      container.style.lineHeight = "1.6";
      container.style.background = "white";
      container.style.color = "#1a1a1a";
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${split?.title || "contract"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(container)
        .save();
    } catch {
      toast.error("Failed to download contract");
    }
  };

  const copySignLink = (token: string) => {
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Signing link copied to clipboard");
  };

  // ── EIP-712 signing via confirmation dialog ────────────────────────
  const handleSignConfirm = async () => {
    if (!myContributor?.invite_token || !split?.contract_address) return;
    setSignDialogOpen(false);

    const success = await signSplit(
      myContributor.invite_token,
      myContributor.slot_index ?? 0,
      split.contract_address
    );

    if (success) {
      toast.success("Agreement signed successfully!");
      await loadSplit();
    } else {
      toast.error(signError || "Failed to sign agreement");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
        <div className="h-64 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!split) {
    return (
      <div className="text-center py-12 text-[var(--text-primary)]">
        Agreement not found
      </div>
    );
  }

  const config = statusConfig[split.status] || statusConfig.draft;
  const signedCount = split.contributors.filter((c) => c.signed).length;

  // Check if current user is an unsigned contributor
  const myContributor = privyUser?.id
    ? split.contributors.find((c) => c.user_id === privyUser.id && !c.signed)
    : undefined;

  // ── Build unified activity timeline ──────────────────────────────
  type TimelineEntry = {
    id: string;
    type: string;
    label: string;
    date: string;
    txHash: string | null;
  };

  const timeline: TimelineEntry[] = [];

  // Add split events
  for (const evt of split.events) {
    let label = "";
    switch (evt.event_type) {
      case "deployed":
        label = "Contract deployed";
        break;
      case "signed": {
        const name = (evt.data?.contributor_name as string) || "Contributor";
        label = `${name} signed`;
        break;
      }
      case "activated":
        label = "Agreement activated";
        break;
      case "voided":
        label = "Agreement voided";
        break;
      default:
        label = evt.event_type;
    }
    timeline.push({
      id: evt.id,
      type: evt.event_type,
      label,
      date: evt.created_at,
      txHash: evt.tx_hash,
    });
  }

  // Add distributions as payment events
  for (const dist of split.distributions) {
    const amount = parseFloat(dist.total_amount);
    const tokenLabel =
      dist.token_type === "native"
        ? `${amount.toFixed(2)} AVAX distributed`
        : `$${amount.toFixed(2)} ${dist.token_type.toUpperCase()} distributed`;
    timeline.push({
      id: dist.id,
      type: "payment",
      label: tokenLabel,
      date: dist.created_at,
      txHash: dist.tx_hash !== "0x0" ? dist.tx_hash : null,
    });
  }

  // Sort by date ascending
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/splits">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{split.title}</h1>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          {split.track && (
            <p className="text-sm text-[var(--text-primary)] mt-0.5">
              {split.track.title} · {split.track.isrc}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-[var(--text-primary)]">Contributors</p>
            <p className="text-lg font-semibold">{split.contributors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-[var(--text-primary)]">Signed</p>
            <p className="text-lg font-semibold">
              {signedCount}/{split.contributors.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-[var(--text-primary)]">Created</p>
            <p className="text-sm font-medium mt-1">
              {new Date(split.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contract */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--text-primary)]" />
              <span className="text-sm font-medium">Split Agreement Contract</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={viewContract}
                disabled={contractLoading}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                {contractLoading ? "Loading..." : contractHtml ? "Hide Contract" : "View Contract"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadContract}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            </div>
          </div>
          {contractHtml && (
            <div
              className="contract-view mt-4 pt-4 border-t border-[var(--border-subtle)] prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: contractHtml }}
            />
          )}
        </CardContent>
      </Card>

      {/* Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contributors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {split.contributors.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    c.signed
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-[var(--border-subtle)] text-[var(--text-primary)]"
                  }`}
                >
                  {c.signed ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.legal_name}</p>
                  <p className="text-xs text-[var(--text-primary)]">
                    {c.role} · {c.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-[family-name:var(--font-jetbrains)]">
                  {c.percentage}%
                </Badge>
                {split.status === "awaiting_signatures" && !c.signed && c.invite_token && isCreator && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-[var(--color-amber)]"
                    onClick={() => copySignLink(c.invite_token!)}
                    title="Copy signing link"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Signing Links — only shown to creator when awaiting */}
      {split.status === "awaiting_signatures" && isCreator && (
        <Card className="border-[var(--color-amber)]/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[var(--color-amber)]" />
              <CardTitle className="text-base">Signing Links</CardTitle>
            </div>
            <p className="text-xs text-[var(--text-primary)]">
              Share each link with the contributor so they can review and sign the agreement.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {split.contributors
              .filter((c) => !c.signed && c.invite_token)
              .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.legal_name}</p>
                      <p className="text-xs text-[var(--text-primary)] truncate">
                        {c.email} · {c.percentage}%
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-3 shrink-0 hover:text-white hover:bg-[var(--color-amber)] hover:border-white/30"
                      onClick={() => copySignLink(c.invite_token!)}
                    >
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy Link
                    </Button>
                  </div>
              ))}
            {split.contributors.every((c) => c.signed) && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center py-2">
                All contributors have signed!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sign Agreement — shown when current user is an unsigned contributor */}
      {myContributor && split.status === "awaiting_signatures" && myContributor.invite_token && myContributor.slot_index !== null && (() => {
        // Check if this contributor has a publisher in contract_data
        const extras = split.contract_data?.contributor_extras as Record<string, { publishing_type?: string }> | undefined;
        const hasPublisher = extras
          ? Object.values(extras).some(
              (e) => e.publishing_type === "publisher"
            ) && (() => {
              const contribIds = Object.keys(extras || {});
              const myIdx = split.contributors.findIndex((c) => c.id === myContributor.id);
              const myExtras = contribIds[myIdx] ? extras[contribIds[myIdx]] : null;
              return myExtras?.publishing_type === "publisher";
            })()
          : false;
        const needsAck = hasPublisher && !publisherAcknowledged;

        return (
          <Card className="border-[var(--color-amber)]/30">
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    You&apos;re invited to sign this agreement
                  </p>
                  <p className="text-xs text-[var(--text-primary)]">
                    {myContributor.legal_name} · {myContributor.role} · {myContributor.percentage}%
                  </p>
                </div>
                <Button
                  className="btn-cta"
                  disabled={signing || needsAck}
                  onClick={() => setSignDialogOpen(true)}
                >
                  {signing ? "Signing..." : "Sign Agreement"}
                </Button>
              </div>
              {hasPublisher && (
                <div className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 space-y-2">
                  <p className="text-xs text-[var(--text-primary)]">
                    By signing, you accept payments on behalf of your publisher and are legally
                    responsible for ensuring your publisher gets paid.
                  </p>
                  <p className="text-xs">
                    <Link
                      href="/dashboard/reclaim"
                      className="text-[var(--color-amber)] hover:underline font-medium dark:hover:text-white transition-colors"
                    >
                      I want to self-publish
                    </Link>{" "}
                    <span className="text-[var(--text-primary)] font-medium">(Save up to 15% in publishing commissions)</span>
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publisherAcknowledged}
                      onChange={(e) => setPublisherAcknowledged(e.target.checked)}
                      className="mt-0.5 accent-[var(--color-amber)]"
                    />
                    <span className="text-xs font-medium">I understand</span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Sign Confirmation Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sign this agreement?</DialogTitle>
            <DialogDescription>
              By signing, you confirm that you agree to the terms of this split
              agreement. Your signature will be recorded permanently.
            </DialogDescription>
          </DialogHeader>
          {signError && (
            <p className="text-sm text-red-400 px-1">{signError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)} disabled={signing}>
              Cancel
            </Button>
            <Button
              className="btn-cta"
              onClick={handleSignConfirm}
              disabled={signing}
            >
              <FileSignature className="w-4 h-4 mr-2" />
              {signing ? "Signing..." : "Confirm & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verified record */}
      {split.status === "active" && split.contract_address && (
        <Card className="border-emerald-600/30 dark:border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Verified Record
                  </p>
                  <p className="text-xs text-[var(--text-primary)] font-[family-name:var(--font-jetbrains)]">
                    {split.contract_address.slice(0, 6)}...{split.contract_address.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(split.contract_address!);
                    toast.success("Address copied");
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <a
                  href={`${EXPLORER_URL}/address/${split.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-primary)] hover:text-[var(--color-amber)]"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline — merges split_events + distributions */}
      {timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {timeline.map((entry, i) => {
              const badgeCfg = eventBadgeConfig[entry.type] || eventBadgeConfig.deployed;
              const isLast = i === timeline.length - 1;
              return (
                <div key={entry.id} className="flex gap-3">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-[var(--border-subtle)] mt-2 shrink-0" />
                    {!isLast && (
                      <div className="w-px flex-1 bg-[var(--border-subtle)]" />
                    )}
                  </div>
                  {/* Event row */}
                  <div className={`flex items-center justify-between flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-1.5 py-0 shrink-0 ${badgeCfg.className}`}
                      >
                        {badgeCfg.label}
                      </Badge>
                      <span className="text-sm truncate">{entry.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs text-[var(--text-primary)]">
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {entry.txHash && (
                        <a
                          href={`${EXPLORER_URL}/tx/${entry.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--text-primary)] hover:text-[var(--color-amber)] flex items-center gap-1"
                        >
                          View Record <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Actions — only creator sees Send + Void */}
      <div className="flex gap-2">
        {split.status === "draft" && isCreator && (
          <Button
            onClick={sendForSignatures}
            disabled={actionLoading}
            className="btn-cta"
          >
            <Send className="w-4 h-4 mr-2" />
            {actionLoading ? "Sending..." : "Send for Signatures"}
          </Button>
        )}
        {isCreator && (split.status === "draft" || split.status === "awaiting_signatures") && (
          <>
            <Button
              variant="destructive"
              onClick={() => setVoidDialogOpen(true)}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Void Agreement
            </Button>

            <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Void this agreement?</DialogTitle>
                  <DialogDescription>
                    This action is permanent and cannot be undone. All pending
                    signatures will be cancelled and this agreement will no
                    longer be valid.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setVoidDialogOpen(false); voidSplit(); }}
                    disabled={actionLoading}
                  >
                    Void Agreement
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
