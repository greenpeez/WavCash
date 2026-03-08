"use client";

import { useWizard } from "../wizard-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function WorkDetails() {
  const { state, dispatch } = useWizard();

  const update = (updates: Partial<typeof state.work>) =>
    dispatch({ type: "UPDATE_WORK", updates });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Work Details
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Additional information about the work. All fields are optional.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Alternate Titles / AKA{" "}
            <span className="text-[var(--text-tertiary)]">(optional)</span>
          </Label>
          <Input
            value={state.work.alternate_titles || ""}
            onChange={(e) => update({ alternate_titles: e.target.value })}
            placeholder='e.g. "Working title", "Radio edit"'
            className="h-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              ISWC Code{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              value={state.work.iswc_code || ""}
              onChange={(e) => update({ iswc_code: e.target.value })}
              placeholder="T-000.000.000-0"
              className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              Genre
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 text-[var(--color-amber)] border-[var(--color-amber)]/30"
              >
                Recommended
              </Badge>
            </Label>
            <Input
              value={state.work.genre || ""}
              onChange={(e) => update({ genre: e.target.value })}
              placeholder="e.g. Hip-Hop, R&B, Pop"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Date of Creation{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              type="date"
              value={state.work.date_of_creation || ""}
              onChange={(e) => update({ date_of_creation: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Recording Session Dates{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              value={state.work.recording_session_dates || ""}
              onChange={(e) =>
                update({ recording_session_dates: e.target.value })
              }
              placeholder="e.g. Jan 5-7, 2025"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Anticipated Release Date{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              type="date"
              value={state.work.anticipated_release_date || ""}
              onChange={(e) =>
                update({ anticipated_release_date: e.target.value })
              }
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Distributor / Label{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              value={state.work.distributor_or_label || ""}
              onChange={(e) =>
                update({ distributor_or_label: e.target.value })
              }
              placeholder="e.g. DistroKid, Independent"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
