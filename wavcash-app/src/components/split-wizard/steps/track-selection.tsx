"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { useWizard } from "../wizard-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Music } from "lucide-react";

interface TrackOption {
  id: string;
  title: string;
  isrc: string;
  album: string | null;
  hasActiveSplit?: boolean;
}

export default function TrackSelection() {
  const { state, dispatch } = useWizard();
  const { user: privyUser } = usePrivy();
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!privyUser) return;
    async function load() {
      try {
        const res = await authFetch("/api/tracks/search");
        if (res.ok) {
          setTracks(await res.json());
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [privyUser]);

  const handleTrackSelect = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track) {
      dispatch({
        type: "SET_TRACK",
        trackId: track.id,
        title: track.title,
        isrc: track.isrc,
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded animate-pulse" />
        <div className="h-24 bg-[var(--bg-surface)] rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold font-[family-name:var(--font-general-sans)]">
          Select a Track
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Choose the track this split agreement is for.
        </p>
      </div>

      {tracks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="w-10 h-10 text-[var(--text-tertiary)] mb-3" />
            <p className="text-sm text-[var(--text-secondary)] text-center">
              No tracks in your catalog yet. Connect Spotify or add tracks to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Track *</Label>
            <Select
              value={state.trackId || ""}
              onValueChange={handleTrackSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a track from your catalog" />
              </SelectTrigger>
              <SelectContent>
                {tracks.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    disabled={t.hasActiveSplit}
                  >
                    {t.title} · {t.isrc}
                    {t.hasActiveSplit && (
                      <span className="ml-2 text-[var(--text-tertiary)]">
                        (active split)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.trackId && (
            <Card className="border-[var(--color-amber)]/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-amber)]/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-[var(--color-amber)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{state.trackTitle}</p>
                    <p className="text-xs text-[var(--text-tertiary)] font-[family-name:var(--font-jetbrains)]">
                      {state.trackIsrc}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">
              Agreement Title{" "}
              <span className="text-[var(--text-tertiary)]">(optional)</span>
            </Label>
            <Input
              value={state.agreementTitle}
              onChange={(e) =>
                dispatch({ type: "SET_AGREEMENT_TITLE", title: e.target.value })
              }
              placeholder={
                state.trackTitle
                  ? `${state.trackTitle}: Split Agreement`
                  : "Custom title for this agreement"
              }
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
