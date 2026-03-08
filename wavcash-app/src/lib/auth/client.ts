import { getAccessToken } from "@privy-io/react-auth";

/**
 * Authenticated fetch — automatically attaches the Privy access token
 * as a Bearer token in the Authorization header.
 *
 * Throws if no token is available — callers should only invoke this
 * when Privy is ready and the user is authenticated.
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No auth token available");
  }

  const headers = new Headers(options?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, { ...options, headers });
}
