"use client";

import { useState, useEffect, useRef } from "react";
import {
  usePrivy,
  useWallets,
  useCreateWallet,
  getEmbeddedConnectedWallet,
} from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";

interface EnsureEmbeddedWalletResult {
  /** The embedded wallet address, or null if not yet created */
  walletAddress: string | null;
  /** True once we've finished checking / creating the wallet */
  walletReady: boolean;
  /** True only if we successfully created a NEW wallet this session */
  walletCreated: boolean;
  /** Error message if wallet creation failed */
  error: string | null;
}

/**
 * Ensures the current user has an embedded Ethereum wallet on Avalanche.
 *
 * Privy's `createOnLogin: "all-users"` only fires with Privy's built-in modal.
 * Since WavCash uses a custom login UI, we must call `createWallet()` explicitly.
 *
 * This hook:
 * 1. Waits for Privy to be ready + authenticated + wallets loaded
 * 2. Checks if embedded wallet already exists
 * 3. If not, calls createWallet() to create one
 * 4. Persists the address to the DB via POST /api/user/register
 * 5. Returns the address + status flags
 */
export function useEnsureEmbeddedWallet(): EnsureEmbeddedWalletResult {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempted = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated || !walletsReady) return;
    if (attempted.current) return;
    attempted.current = true;

    async function ensureWallet() {
      // 1. Check if embedded wallet already exists
      const existing = getEmbeddedConnectedWallet(wallets);
      if (existing) {
        setWalletAddress(existing.address);
        setWalletReady(true);
        // Still persist to DB in case it wasn't saved before
        persistWallet(existing.address);
        return;
      }

      // 2. No wallet found - create one
      try {
        const wallet = await createWallet();
        const address = wallet.address;
        setWalletAddress(address);
        setWalletCreated(true);
        setWalletReady(true);
        persistWallet(address);
      } catch (err: unknown) {
        // Handle "already has wallet" error - re-check wallet list
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("already has")) {
          // Wallet exists but wasn't in our initial check - refetch
          const retry = getEmbeddedConnectedWallet(wallets);
          if (retry) {
            setWalletAddress(retry.address);
            setWalletReady(true);
            persistWallet(retry.address);
            return;
          }
        }
        console.error("Failed to create embedded wallet:", err);
        setError(msg);
        setWalletReady(true); // Mark ready even on failure so UI can proceed
      }
    }

    ensureWallet();
  }, [ready, authenticated, walletsReady, wallets, createWallet]);

  return { walletAddress, walletReady, walletCreated, error };
}

/**
 * Persist wallet address to the user's DB record via the register endpoint.
 * Fire-and-forget - errors are logged but don't block the UI.
 */
function persistWallet(address: string) {
  authFetch("/api/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address: address }),
  }).catch((err) => {
    console.error("Failed to persist wallet address:", err);
  });
}
