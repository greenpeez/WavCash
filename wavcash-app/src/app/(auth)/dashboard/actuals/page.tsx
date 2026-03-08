"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

const DISTRIBUTORS = [
  { value: "distrokid", label: "DistroKid" },
  { value: "tunecore", label: "TuneCore" },
  { value: "amuse", label: "Amuse" },
  { value: "cd_baby", label: "CD Baby" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

interface UploadResult {
  statement_id: string;
  lines_count: number;
  total_earnings: number;
  period_start: string | null;
  period_end: string | null;
  preview: Array<{
    isrc: string | null;
    track_title: string | null;
    platform: string | null;
    streams: number | null;
    earnings: number | null;
    period: string | null;
  }>;
}

interface MatchResult {
  matched: number;
  unmatched: number;
  flagged: number;
  total_gap: number;
}

interface StatementRow {
  id: string;
  distributor: string;
  upload_filename: string;
  total_earnings: number;
  status: string;
  created_at: string;
}

interface DiscrepancyLine {
  id: string;
  isrc: string;
  track_title: string;
  platform: string;
  earnings: number;
  oracle_estimated: number;
  delta_pct: number;
  flagged: boolean;
}

export default function ActualsPage() {
  const [distributor, setDistributor] = useState("distrokid");
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyLine[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user: privyUser, ready } = usePrivy();

  const { data: statements = [], isLoading: loading, mutate: mutateStatements } = useAuthSWR<StatementRow[]>(
    privyUser ? `actuals:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/actuals");
      if (!res.ok) throw new Error("Failed to load statements");
      return res.json();
    }
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);
    setMatchResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("distributor", distributor);

    try {
      const res = await authFetch("/api/actuals/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setUploadResult(data);
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmAndMatch() {
    if (!uploadResult) return;
    setMatching(true);
    setError(null);

    try {
      const res = await authFetch("/api/actuals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement_id: uploadResult.statement_id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setMatchResult(data);
      await Promise.all([
        mutateStatements(),
        loadDiscrepancies(uploadResult.statement_id),
      ]);
    } catch {
      setError("Failed to run matching");
    } finally {
      setMatching(false);
    }
  }

  async function loadDiscrepancies(statementId: string) {
    setSelectedStatement(statementId);
    try {
      const res = await authFetch(`/api/actuals/discrepancies?statement_id=${statementId}`);
      if (!res.ok) throw new Error("Failed to load discrepancies");
      setDiscrepancies(await res.json());
    } catch {
      setDiscrepancies([]);
    }
  }

  if (!ready || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-general-sans)] text-2xl font-bold tracking-tight">
          Actuals
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Upload distributor statements and detect missing money.
        </p>
      </div>

      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={distributor} onValueChange={setDistributor}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTRIBUTORS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-[var(--border-subtle)] hover:border-[var(--accent)] cursor-pointer transition-colors text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Choose CSV file"}
              </div>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload preview */}
      {uploadResult && !matchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Preview — {uploadResult.lines_count} rows parsed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span>
                Total: <strong>{formatCurrency(uploadResult.total_earnings)}</strong>
              </span>
              {uploadResult.period_start && (
                <span className="text-[var(--text-tertiary)]">
                  Period: {uploadResult.period_start} — {uploadResult.period_end}
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Track</TableHead>
                    <TableHead>ISRC</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadResult.preview.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{line.track_title || "—"}</TableCell>
                      <TableCell className="font-[family-name:var(--font-jetbrains)] text-xs">
                        {line.isrc || "—"}
                      </TableCell>
                      <TableCell className="text-sm">{line.platform || "—"}</TableCell>
                      <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm">
                        {line.earnings != null ? formatCurrency(line.earnings) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleConfirmAndMatch} disabled={matching} className="gap-2">
              {matching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {matching ? "Running analysis..." : "Confirm & Detect Missing Money"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Match results */}
      {matchResult && (
        <Card className={matchResult.flagged > 0 ? "border-[var(--accent)]/50" : ""}>
          <CardContent className="py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  Matched
                </p>
                <p className="text-xl font-bold">{matchResult.matched}</p>
              </div>
              <div>
                <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  Unmatched
                </p>
                <p className="text-xl font-bold">{matchResult.unmatched}</p>
              </div>
              <div>
                <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  Discrepancies
                </p>
                <p className="text-xl font-bold text-[var(--accent)]">
                  {matchResult.flagged}
                </p>
              </div>
              <div>
                <p className="text-xs font-[family-name:var(--font-jetbrains)] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">
                  Potential Gap
                </p>
                <p className="text-xl font-bold text-[var(--accent)]">
                  {formatCurrency(matchResult.total_gap)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discrepancies table */}
      {discrepancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--accent)]" />
              Discrepancies ({discrepancies.length} tracks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Track</TableHead>
                  <TableHead>ISRC</TableHead>
                  <TableHead className="text-right">Oracle Est.</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-sm font-medium">
                      {line.track_title || "Unknown"}
                    </TableCell>
                    <TableCell className="font-[family-name:var(--font-jetbrains)] text-xs">
                      {line.isrc || "—"}
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm">
                      {formatCurrency(line.oracle_estimated || 0)}
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm">
                      {formatCurrency(line.earnings || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          Math.abs(line.delta_pct) > 30
                            ? "text-red-500 border-red-500/30"
                            : "text-[var(--accent)] border-[var(--accent)]/30"
                        }
                      >
                        {line.delta_pct > 0 ? "+" : ""}
                        {line.delta_pct?.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Past statements */}
      {statements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Distributor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((stmt) => (
                  <TableRow
                    key={stmt.id}
                    className="cursor-pointer"
                    onClick={() => loadDiscrepancies(stmt.id)}
                  >
                    <TableCell className="text-sm">{stmt.upload_filename}</TableCell>
                    <TableCell className="text-sm capitalize">{stmt.distributor.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm">
                      {formatCurrency(stmt.total_earnings || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          stmt.status === "confirmed"
                            ? "text-green-500 border-green-500/30"
                            : "text-[var(--text-tertiary)]"
                        }
                      >
                        {stmt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[var(--text-tertiary)]">
                      {new Date(stmt.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
