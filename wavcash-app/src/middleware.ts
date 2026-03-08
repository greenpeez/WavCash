import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/sniffer", "/sign", "/spotify-callback", "/docs", "/faq", "/terms", "/privacy"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes (they handle their own auth)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Allow sign_token flow through — the dashboard layout validates auth client-side
  if (request.nextUrl.searchParams.has("sign_token")) {
    return NextResponse.next();
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
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
