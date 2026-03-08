"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface SampleEntry {
  song_title: string;
  original_artist: string;
  owner: string;
  clearance_status: "cleared" | "pending" | "uncleared";
  split_adjustment_pct?: number;
}

interface SampleCardProps {
  sample: SampleEntry;
  onChange: (updates: Partial<SampleEntry>) => void;
  onRemove: () => void;
}

export default function SampleCard({
  sample,
  onChange,
  onRemove,
}: SampleCardProps) {
  return (
    <Card className="border-[var(--border-subtle)]">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {sample.song_title || "New Sample"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--text-tertiary)] hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Original Song Title *</Label>
            <Input
              value={sample.song_title}
              onChange={(e) => onChange({ song_title: e.target.value })}
              placeholder="Song title"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Original Artist *</Label>
            <Input
              value={sample.original_artist}
              onChange={(e) => onChange({ original_artist: e.target.value })}
              placeholder="Artist / Owner"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rights Owner / Label *</Label>
            <Input
              value={sample.owner}
              onChange={(e) => onChange({ owner: e.target.value })}
              placeholder="Label or publisher"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Clearance Status *</Label>
            <Select
              value={sample.clearance_status}
              onValueChange={(v) =>
                onChange({
                  clearance_status: v as SampleEntry["clearance_status"],
                })
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="uncleared">Uncleared</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            Split Adjustment %{" "}
            <span className="text-[var(--text-tertiary)]">(optional)</span>
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={sample.split_adjustment_pct ?? ""}
            onChange={(e) =>
              onChange({
                split_adjustment_pct: e.target.value
                  ? parseFloat(e.target.value)
                  : undefined,
              })
            }
            placeholder="% of royalties owed to sample owner"
            className="h-9 text-sm font-[family-name:var(--font-jetbrains)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
