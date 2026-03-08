/// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
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

  // Consent check — only for authenticated users on /app/* routes (not /app/consent or /onboarding)
  const needsConsentCheck =
    !!token &&
    token.sub !== undefined &&
    pathname.startsWith("/app") &&
    !pathname.startsWith("/app/consent") &&
    !pathname.startsWith("/onboarding");

  if (needsConsentCheck) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    // Use the Supabase REST API directly — plain fetch works on the Edge runtime
    const consentRes = await fetch(
      `${supabaseUrl}/rest/v1/consent_records?user_id=eq.${encodeURIComponent(token.sub!)}` +
      `&is_current=eq.true&select=id&limit=1`,
      {
        headers: {
          "apikey":        serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Accept":        "application/json",
        },
      },
    );

    const rows = await consentRes.json() as unknown;
    const hasConsent = Array.isArray(rows) && (rows as Array<unknown>).length > 0;

    if (!hasConsent) {
      const consentUrl = new URL("/onboarding/consent", req.url);
      consentUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(consentUrl);
    }
  }

  // Forward pathname so layout.tsx can read it (needed for onboarding guard)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*"],
};
