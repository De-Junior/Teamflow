// PASTE LOCATION: src/proxy.ts (overwrite entire file)
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/reset-password",
  "/invite",
  "/api/auth",
  "/api/register",
  "/api/forgot-password",
  "/api/reset-password",
  "/api/webhooks",
  "/",
];

function isPublicInvitationLookup(pathname: string, method: string) {
  return method === "GET" && /^\/api\/invitations\/[^/]+$/.test(pathname);
}

const AUTH_ROUTES = ["/login", "/register"];

export default auth(async function proxy(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: { id?: string; organizationId?: string } } }).auth;

  const isPublic =
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/")) ||
    isPublicInvitationLookup(pathname, req.method);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute && session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isPublic && !session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/api/") && session?.user) {
    const orgId = req.headers.get("x-organization-id");
    if (orgId && orgId !== session.user.organizationId) {
      return NextResponse.json(
        { success: false, message: "Tenant mismatch" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};