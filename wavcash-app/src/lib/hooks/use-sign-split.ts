"use client";

import { useState, useCallback } from "react";
import { useWallets, getEmbeddedConnectedWallet } from "@privy-io/react-auth";
import { authFetch } from "@/lib/auth/client";

const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID === "43114" ? 43114 : 43113;

interface UseSignSplitResult {
  /** Call this to sign. Returns true on success, false on failure. */
  signSplit: (
    inviteToken: string,
    slotIndex: number,
    contractAddress: string
  ) => Promise<boolean>;
  /** True while the signing tx is in flight */
  signing: boolean;
  /** Error message if signing failed */
  error: string | null;
}

/**
 * Hook that produces an EIP-712 signature from the user's Privy embedded wallet
 * and sends it to the backend for on-chain relay.
 *
 * The wallet signs silently (no MetaMask popup) because Privy embedded wallets
 * are custodial. The UX is: user clicks confirm in our dialog → done.
 */
export function useSignSplit(): UseSignSplitResult {
  const { wallets } = useWallets();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signSplit = useCallback(
    async (
      inviteToken: string,
      slotIndex: number,
      contractAddress: string
    ): Promise<boolean> => {
      setSigning(true);
      setError(null);

      try {
        // 1. Get the embedded wallet
        const wallet = getEmbeddedConnectedWallet(wallets);
        if (!wallet) {
          throw new Error("Wallet not found. Please try refreshing the page.");
        }

        const address = wallet.address as `0x${string}`;

        // 2. Build EIP-712 typed data
        const typedData = {
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            SignAgreement: [
              { name: "slotIndex", type: "uint256" },
              { name: "signer", type: "address" },
            ],
          },
          primaryType: "SignAgreement",
          domain: {
            name: "WavCashSplit",
            version: "1",
            chainId: CHAIN_ID,
            verifyingContract: contractAddress,
          },
          message: {
            slotIndex: slotIndex.toString(),
            signer: address,
          },
        };

        // 3. Sign via Privy embedded wallet (silent, no popup)
        const provider = await wallet.getEthereumProvider();
        const signature = await provider.request({
          method: "eth_signTypedData_v4",
          params: [address, JSON.stringify(typedData)],
        });

        // 4. Send signature + wallet to backend for on-chain relay
        const res = await authFetch(`/api/sign/${inviteToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: address,
            signature,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to sign agreement");
        }

        setSigning(false);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Signing failed";
        console.error("useSignSplit error:", err);
        setError(msg);
        setSigning(false);
        return false;
      }
    },
    [wallets]
  );

  return { signSplit, signing, error };
}
