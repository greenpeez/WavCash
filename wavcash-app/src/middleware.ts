import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/sniffer", "/sign", "/spotify-callback", "/docs", "/splits", "/pricing", "/faq", "/terms", "/privacy", "/data-request"];

/** Set wc-geo cookie from Vercel's geo header (once, on first visit). */
function withGeoCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.has("wc-geo")) {
    const country = request.headers.get("x-vercel-ip-country") || "XX";
    response.cookies.set("wc-geo", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return withGeoCookie(request, NextResponse.next());
  }

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublic) {
    return withGeoCookie(request, NextResponse.next());
  }

  // Allow sign_token flow through — the dashboard layout validates auth client-side
  if (request.nextUrl.searchParams.has("sign_token")) {
    return withGeoCookie(request, NextResponse.next());
  }

  // Check for Privy auth token cookie
  const privyToken =
    request.cookies.get("privy-token")?.value ??
    request.cookies.get("privy-id-token")?.value ??
    request.cookies.get("privy-access-token")?.value;

  if (!privyToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return withGeoCookie(request, NextResponse.redirect(url));
  }

  return withGeoCookie(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
