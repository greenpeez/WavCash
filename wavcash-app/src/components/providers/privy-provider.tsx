"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { avalanche } from "viem/chains";

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Skip Privy during build / when app ID not configured
  if (!appId || appId.startsWith("your-")) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#F5A623",
        },
        loginMethods: ["email", "google", "spotify"],
        embeddedWallets: {
          showWalletUIs: false,
          ethereum: {
            createOnLogin: "all-users",
          },
        },
        defaultChain: avalanche,
        supportedChains: [avalanche],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
