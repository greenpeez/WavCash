"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Loader2, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SpotifyCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-tertiary)]" />
        </div>
      }
    >
      <SpotifyCallbackContent />
    </Suspense>
  );
}

function SpotifyCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();

  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  useEffect(() => {
    // Handle Spotify-level errors immediately
    if (error) {
      setStatus("error");
      setErrorMessage(
        error === "access_denied"
          ? "You denied access to Spotify. Please try again."
          : `Spotify authorization failed: ${error}`
      );
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received from Spotify.");
      return;
    }

    // Wait for Privy SDK to be ready
    if (!ready) return;

    // If user is not authenticated, show error
    if (!authenticated) {
      setStatus("error");
      setErrorMessage(
        "Your session has expired. Please log in again and reconnect Spotify."
      );
      return;
    }

    // Prevent double-execution in React strict mode
    if (attempted.current) return;
    attempted.current = true;

    async function exchangeCode() {
      try {
        const res = await authFetch("/api/spotify/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Exchange failed (${res.status})`);
        }

        // Success — redirect to onboarding with connected indicator
        router.replace("/onboarding?spotify_connected=1");
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to connect Spotify."
        );
      }
    }

    exchangeCode();
  }, [ready, authenticated, code, error, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-general-sans)] text-xl tracking-tight flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Spotify Connection Failed
            </CardTitle>
            <CardDescription className="text-[var(--text-secondary)]">
              {errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => router.replace("/onboarding")}
            >
              Back to Onboarding
            </Button>
            {ready && !authenticated && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  router.replace("/login?redirect=/onboarding")
                }
              >
                Log in again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      <p className="text-[var(--text-secondary)] text-sm">
        Connecting your Spotify account...
      </p>
    </div>
  );
}
