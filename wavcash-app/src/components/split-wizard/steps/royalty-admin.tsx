"use client";

import { useWizard } from "../wizard-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RoyaltyAdmin() {
  const { state, dispatch } = useWizard();

  const updateRoyalty = (updates: Partial<typeof state.royalty>) =>
    dispatch({ type: "UPDATE_ROYALTY", updates });
  const updateAdmin = (updates: Partial<typeof state.administration>) =>
    dispatch({ type: "UPDATE_ADMINISTRATION", updates });

  // ── Controlled composition validation ──────────────────────────────────
  const controlledPct = state.royalty.controlled_pct;
  const controlledError =
    state.royalty.mechanical_rate === "controlled" && controlledPct != null
      ? controlledPct <= 0
        ? "Must be greater than 0"
        : controlledPct >= 100
          ? "Must be less than 100"
          : null
      : null;

  // ── Other/custom rate validation ───────────────────────────────────────
  const customDesc = state.royalty.mechanical_rate_description || "";
  const customError =
    state.royalty.mechanical_rate === "other" &&
    customDesc.trim().length > 0 &&
    !/\d/.test(customDesc)
      ? "Must include a number (e.g. 75% of statutory)"
      : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Royalty & Administration
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Configure mechanical royalty rates and who administers the work.
        </p>
      </div>

      {/* Mechanical rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mechanical Royalty Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Rate Type</Label>
            <Select
              value={state.royalty.mechanical_rate}
              onValueChange={(v) =>
                updateRoyalty({
                  mechanical_rate: v as "statutory" | "controlled" | "other",
                })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="statutory">US Statutory Rate</SelectItem>
                <SelectItem value="controlled">
                  Controlled Composition Rate
                </SelectItem>
                <SelectItem value="other">Other / Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rate-specific tooltips */}
          {state.royalty.mechanical_rate === "statutory" && (
            <p className="text-xs text-[var(--text-secondary)]">
              The statutory rate is set by the U.S. Copyright Royalty Board. All
              mechanical royalties for this work will be calculated at the
              current statutory rate per the split percentages in this agreement.
            </p>
          )}

          {state.royalty.mechanical_rate === "controlled" && (
            <>
              <p className="text-xs text-[var(--text-secondary)]">
                A controlled composition clause means the contributor agrees to
                accept a reduced mechanical rate (typically 75% of statutory).
                This is common in label deals where the label negotiates a lower
                rate for songs written by their signed artists.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Controlled Composition % *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={state.royalty.controlled_pct ?? ""}
                  onChange={(e) =>
                    updateRoyalty({
                      controlled_pct: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="e.g. 75"
                  className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
                />
                {controlledError && (
                  <p className="text-xs text-red-500">{controlledError}</p>
                )}
              </div>
            </>
          )}

          {state.royalty.mechanical_rate === "other" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input
                value={state.royalty.mechanical_rate_description || ""}
                onChange={(e) =>
                  updateRoyalty({ mechanical_rate_description: e.target.value })
                }
                placeholder="e.g. 75% of statutory rate"
                className="h-9 text-sm"
              />
              {customError && (
                <p className="text-xs text-red-500">{customError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Administration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Administration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* WavCash default */}
          <div className="rounded-lg bg-[var(--color-amber)]/5 border border-[var(--color-amber)]/20 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">WavCash</span>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 text-[var(--color-amber)] border-[var(--color-amber)]/30"
              >
                Recommended
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              WavCash automatically distributes royalties to all contributors.
              You must set your WavCash account as your payment destination with
              your distributor/DSP.
            </p>
          </div>

          {/* Third-party publishing checkbox */}
          <div className="space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={state.administration.has_third_party_publishing}
                onChange={(e) =>
                  updateAdmin({
                    has_third_party_publishing: e.target.checked,
                    third_party_acknowledged: false,
                  })
                }
                className="mt-0.5 accent-[var(--color-amber)]"
              />
              <span className="text-sm">
                I have a publishing agreement granting a third party rights to my
                share of mechanical royalties.
              </span>
            </label>

            {state.administration.has_third_party_publishing && (
              <div className="ml-6 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3 space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Your distributor or publishing partner may have rights to
                  collect a share of your mechanical royalties. If you intend to
                  get paid directly from DSPs into your WavCash account, it is
                  your legal responsibility to ensure your publishing partner
                  gets paid. Optionally, you can arrange for your publishing
                  partner to collect from DSPs and make payments to your WavCash
                  account after deducting their commission.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      state.administration.third_party_acknowledged || false
                    }
                    onChange={(e) =>
                      updateAdmin({
                        third_party_acknowledged: e.target.checked,
                      })
                    }
                    className="mt-0.5 accent-[var(--color-amber)]"
                  />
                  <span className="text-xs font-medium">I understand</span>
                </label>
              </div>
            )}
          </div>

          {/* Payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Timeframe (days)</Label>
              <Input
                type="number"
                min={1}
                value={state.administration.payment_timeframe_days}
                onChange={(e) =>
                  updateAdmin({
                    payment_timeframe_days: parseInt(e.target.value) || 45,
                  })
                }
                className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
              />
              <p className="text-xs text-[var(--text-secondary)]">
                How soon do you want to get paid after any contributor gets paid
                for licensing this track? (Recommended: 30 days)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accounting Frequency</Label>
              <Select
                value={state.administration.accounting_frequency}
                onValueChange={(v) =>
                  updateAdmin({
                    accounting_frequency: v as
                      | "quarterly"
                      | "semi-annually"
                      | "annually",
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[var(--text-secondary)]">
                How often do you want reports on licensing payout for this track?
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
