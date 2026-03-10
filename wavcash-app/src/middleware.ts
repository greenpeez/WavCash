import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/sniffer", "/sign", "/spotify-callback", "/docs", "/splits", "/pricing", "/faq", "/terms", "/privacy", "/data-request", "/reclaim"];

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
  const hostname = request.headers.get("host") || "";

  // Admin subdomain: redirect root to admin dashboard, block non-admin hosts
  const isAdminHost =
    hostname === "admin.wav.cash" ||
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1");

  if (isAdminHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/admin/data-requests";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dashboard/admin") && !isAdminHost) {
    const url = request.nextUrl.clone();
    url.hostname = "wav.cash";
    url.pathname = "/";
    url.port = "";
    return NextResponse.redirect(url);
  }

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
