"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Music } from "lucide-react";
import { useAuthSWR } from "@/lib/hooks/use-auth-swr";

interface TrackRow {
  id: string;
  title: string;
  isrc: string;
  album: string | null;
  album_art_url: string | null;
  popularity: number | null;
  totalStreams: number;
  totalEstimated: number;
  topPlatform: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function TracksPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("earnings");
  const { user: privyUser, ready } = usePrivy();

  const { data: tracks = [], isLoading } = useAuthSWR<TrackRow[]>(
    privyUser ? `tracks:${privyUser.id}` : null,
    async () => {
      const res = await authFetch("/api/tracks");
      if (!res.ok) throw new Error("Failed to load tracks");
      return res.json();
    }
  );

  const filtered = tracks
    .filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.isrc.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "earnings") return b.totalEstimated - a.totalEstimated;
      if (sortBy === "streams") return b.totalStreams - a.totalStreams;
      return a.title.localeCompare(b.title);
    });

  if (!ready || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-general-sans)] text-2xl font-bold tracking-tight">
          Tracks
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          {tracks.length} tracks in your catalog
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input
            placeholder="Search by title or ISRC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="earnings">By earnings</SelectItem>
            <SelectItem value="streams">By streams</SelectItem>
            <SelectItem value="name">By name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>ISRC</TableHead>
                <TableHead className="text-right">Streams</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead>Top Platform</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-[var(--text-tertiary)]">
                    {search ? "No tracks match your search" : "No tracks in catalog yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {track.album_art_url ? (
                          <img
                            src={track.album_art_url}
                            alt={track.title}
                            className="w-9 h-9 rounded object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded bg-[var(--bg-surface)] flex items-center justify-center">
                            <Music className="h-4 w-4 text-[var(--text-tertiary)]" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{track.title}</p>
                          {track.album && (
                            <p className="text-xs text-[var(--text-tertiary)]">{track.album}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-[var(--text-tertiary)]">
                        {track.isrc}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm">
                      {track.totalStreams > 0
                        ? track.totalStreams.toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-[family-name:var(--font-jetbrains)] text-sm font-medium">
                      {track.totalEstimated > 0
                        ? formatCurrency(track.totalEstimated)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {track.topPlatform}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
