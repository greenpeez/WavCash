import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/spotify-callback?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/spotify-callback?error=no_code`
    );
  }

  // Pass the authorization code to the client-side handler
  // (the client page has access to the Privy SDK and can attach a Bearer token)
  const redirectUrl = new URL("/spotify-callback", origin);
  redirectUrl.searchParams.set("code", code);

  return NextResponse.redirect(redirectUrl.toString());
}
