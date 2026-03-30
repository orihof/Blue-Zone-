/// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/app") || pathname.startsWith("/onboarding");

  if (isProtected && !token) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  // Guard check — onboarding + consent — only for authenticated users on /app/* routes.
  // Excluded: /app/consent, /app/onboarding/*, /onboarding/* (these are part of the flow itself).
  const needsGuardCheck =
    !!token &&
    token.sub !== undefined &&
    pathname.startsWith("/app") &&
    !pathname.startsWith("/app/consent") &&
    !pathname.startsWith("/app/onboarding") &&
    !pathname.startsWith("/onboarding");

  if (needsGuardCheck) {
    try {
      const guardSecret = process.env.INTERNAL_GUARD_SECRET ?? "";
      const guardUrl    = new URL("/api/auth/guard", req.url);
      const guardRes    = await fetch(guardUrl, {
        headers: {
          "x-guard-secret": guardSecret,
          "x-user-id":      token.sub!,
        },
      });

      if (guardRes.ok) {
        const { redirect } = await guardRes.json() as { redirect: string | null };
        if (redirect) {
          const dest = new URL(redirect, req.url);
          // Thread callbackUrl for the consent redirect only
          if (redirect === "/onboarding/consent") {
            dest.searchParams.set("callbackUrl", pathname);
          }
          return NextResponse.redirect(dest);
        }
      }
    } catch {
      // Fail open: if guard check fails, allow the request through
    }
  }

  // Forward pathname so server components can read it if needed
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*"],
};
