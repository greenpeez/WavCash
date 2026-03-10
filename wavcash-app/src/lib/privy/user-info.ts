import { getPrivyClient } from "./server";

/**
 * Fetch the user's embedded wallet, email, and phone from Privy's API.
 * More reliable than client-side hooks because it doesn't depend on async
 * wallet initialization timing in the browser.
 */
export async function getPrivyUserInfo(userId: string): Promise<{
  walletAddress: string | null;
  email: string | null;
  phone: string | null;
}> {
  try {
    const privy = getPrivyClient();
    const user = await privy.users()._get(userId);

    let walletAddress: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;

    for (const account of user.linked_accounts) {
      if (
        account.type === "wallet" &&
        "connector_type" in account &&
        account.connector_type === "embedded" &&
        "chain_type" in account &&
        account.chain_type === "ethereum" &&
        "address" in account
      ) {
        walletAddress = account.address as string;
      } else if (account.type === "email" && "address" in account) {
        // Direct email login — takes priority over OAuth-derived emails
        email = (account.address as string).toLowerCase();
      } else if (
        !email &&
        (account.type === "google_oauth" || account.type === "spotify_oauth") &&
        "email" in account &&
        account.email
      ) {
        // Google/Spotify OAuth — email is on .email, not .address
        email = (account.email as string).toLowerCase();
      } else if (account.type === "phone" && "number" in account) {
        phone = account.number as string;
      }
    }

    return { walletAddress, email, phone };
  } catch (err) {
    console.error("Failed to fetch user info from Privy:", err);
    return { walletAddress: null, email: null, phone: null };
  }
}
