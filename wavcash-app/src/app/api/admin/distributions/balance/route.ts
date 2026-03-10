import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import {
  hasDistributableBalance,
  hasDistributableTokenBalance,
  SUPPORTED_TOKENS,
} from "@/lib/contracts/interact";

/**
 * GET /api/admin/distributions/balance?contract=0x...
 * Returns current distributable balances for a contract.
 */
export async function GET(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contract = searchParams.get("contract");

  if (!contract || !contract.startsWith("0x")) {
    return NextResponse.json(
      { error: "Invalid contract address" },
      { status: 400 }
    );
  }

  const contractAddress = contract as `0x${string}`;

  try {
    const avax = await hasDistributableBalance(contractAddress);

    const tokens = await Promise.all(
      SUPPORTED_TOKENS.map(async (token) => {
        const result = await hasDistributableTokenBalance(
          contractAddress,
          token.address,
          token.decimals
        );
        return {
          symbol: token.symbol,
          dbKey: token.dbKey,
          ...result,
        };
      })
    );

    return NextResponse.json({ avax, tokens });
  } catch (err) {
    console.error("Balance check error:", err);
    return NextResponse.json(
      { error: "Failed to read balances" },
      { status: 500 }
    );
  }
}
