"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Banknote,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Contributor {
  legal_name: string;
  role: string;
  percentage: number;
  wallet_address: string | null;
  user_id: string | null;
}

interface LookupResult {
  track: { id: string; title: string; isrc: string };
  split: {
    id: string;
    title: string;
    status: string;
    contract_address: string | null;
    contributors: Contributor[];
  };
}

interface BalanceInfo {
  avax: { hasBalance: boolean; balance: string };
  tokens: Array<{
    symbol: string;
    dbKey: string;
    hasBalance: boolean;
    balance: string;
  }>;
}

interface DistributeResult {
  success: boolean;
  message?: string;
  avax: string | null;
  tokens: Record<string, string>;
  tx_hashes: string[];
}

export default function AdminDistributionsPage() {
  const [isrc, setIsrc] = useState("");
  const [searching, setSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [balances, setBalances] = useState<BalanceInfo | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [distributing, setDistributing] = useState(false);
  const [distributeResult, setDistributeResult] =
    useState<DistributeResult | null>(null);
  const [distributeError, setDistributeError] = useState<string | null>(null);

  const fetchBalances = useCallback(async (contractAddress: string) => {
    setLoadingBalances(true);
    try {
      const res = await authFetch(
        `/api/admin/distributions/balance?contract=${encodeURIComponent(contractAddress)}`
      );
      if (res.ok) {
        setBalances(await res.json());
      }
    } catch {
      // Non-critical
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  const handleLookup = useCallback(async () => {
    const trimmed = isrc.trim();
    if (!trimmed) return;

    setSearching(true);
    setLookupError(null);
    setLookupResult(null);
    setBalances(null);
    setDistributeResult(null);
    setDistributeError(null);

    try {
      const res = await authFetch(
        `/api/admin/distributions/lookup?isrc=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) {
        const err = await res.json();
        setLookupError(err.error || "Lookup failed");
        return;
      }
      const data: LookupResult = await res.json();
      setLookupResult(data);

      // Auto-fetch balances if contract exists
      if (data.split.contract_address) {
        fetchBalances(data.split.contract_address);
      }
    } catch {
      setLookupError("Network error");
    } finally {
      setSearching(false);
    }
  }, [isrc, fetchBalances]);

  const handleDistribute = useCallback(async () => {
    if (!lookupResult) return;
    setDistributing(true);
    setDistributeError(null);
    setDistributeResult(null);

    try {
      const res = await authFetch(
        `/api/admin/distributions/${lookupResult.split.id}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setDistributeError(data.error || "Distribution failed");
        return;
      }
      setDistributeResult(data);

      // Refresh balances after distribution
      if (lookupResult.split.contract_address) {
        fetchBalances(lookupResult.split.contract_address);
      }
    } catch {
      setDistributeError("Network error");
    } finally {
      setDistributing(false);
    }
  }, [lookupResult, fetchBalances]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payment Distribution</h1>

      {/* ISRC Lookup */}
      <Card>
        <CardContent className="py-4">
          <label className="text-xs text-[var(--text-tertiary)] mb-1.5 block">
            Look up by ISRC
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={isrc}
              onChange={(e) => setIsrc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLookup();
              }}
              placeholder="e.g. USRC12345678"
              className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md px-3 py-2 text-sm font-[family-name:var(--font-jetbrains)]"
            />
            <Button size="sm" disabled={!isrc.trim() || searching} onClick={handleLookup}>
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {lookupError && (
        <Card>
          <CardContent className="py-4 flex items-center gap-3 text-red-500">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{lookupError}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {lookupResult && (
        <>
          {/* Track info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {lookupResult.track.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-xs text-[var(--text-tertiary)]">
                ISRC:{" "}
                <span className="font-[family-name:var(--font-jetbrains)]">
                  {lookupResult.track.isrc}
                </span>
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Split: {lookupResult.split.title}
              </p>
              {lookupResult.split.contract_address && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  Contract:{" "}
                  <span className="font-[family-name:var(--font-jetbrains)] text-[10px]">
                    {lookupResult.split.contract_address}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contributors table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Role</th>
                      <th className="pb-2 pr-4">Share</th>
                      <th className="pb-2">Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupResult.split.contributors.map((c, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border-subtle)] last:border-0"
                      >
                        <td className="py-2 pr-4">{c.legal_name}</td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className="text-[10px]">
                            {c.role}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 font-[family-name:var(--font-jetbrains)]">
                          {c.percentage}%
                        </td>
                        <td className="py-2 font-[family-name:var(--font-jetbrains)] text-[10px] text-[var(--text-tertiary)]">
                          {c.wallet_address
                            ? `${c.wallet_address.slice(0, 6)}...${c.wallet_address.slice(-4)}`
                            : "Not linked"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Balances */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Contract Balances</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBalances ? (
                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading balances…
                </div>
              ) : balances ? (
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)]">AVAX</p>
                    <p className="font-[family-name:var(--font-jetbrains)] font-semibold">
                      {balances.avax.balance}
                    </p>
                  </div>
                  {balances.tokens.map((t) => (
                    <div key={t.dbKey}>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {t.symbol}
                      </p>
                      <p className="font-[family-name:var(--font-jetbrains)] font-semibold">
                        ${t.balance}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-tertiary)]">
                  No balance data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Distribute action */}
          <div className="flex items-center gap-4">
            <Button
              disabled={distributing || !lookupResult.split.contract_address}
              onClick={handleDistribute}
            >
              {distributing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Banknote className="w-4 h-4 mr-2" />
              )}
              Distribute
            </Button>
          </div>

          {/* Distribute error */}
          {distributeError && (
            <Card>
              <CardContent className="py-3 flex items-center gap-3 text-red-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{distributeError}</p>
              </CardContent>
            </Card>
          )}

          {/* Distribute result */}
          {distributeResult && (
            <Card>
              <CardContent className="py-3">
                {distributeResult.tx_hashes.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {distributeResult.message ||
                      "No distributable balance found"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <p className="text-sm font-medium">
                        Distribution successful
                      </p>
                    </div>
                    {distributeResult.avax && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        AVAX: {distributeResult.avax}
                      </p>
                    )}
                    {Object.entries(distributeResult.tokens).map(
                      ([key, val]) => (
                        <p
                          key={key}
                          className="text-sm text-[var(--text-secondary)]"
                        >
                          {key.toUpperCase()}: {val}
                        </p>
                      )
                    )}
                    <div className="text-[10px] text-[var(--text-tertiary)] font-[family-name:var(--font-jetbrains)] space-y-0.5">
                      {distributeResult.tx_hashes.map((h) => (
                        <p key={h}>{h}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
