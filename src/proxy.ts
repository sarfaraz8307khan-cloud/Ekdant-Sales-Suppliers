import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ekdant_session";
const PROTECTED_PATHS = [
  "/",
  "/vehicles",
  "/inventory",
  "/purchases",
  "/tyre-history",
  "/vendors",
  "/drivers",
  "/tyre-models",
  "/vehicle-configurations",
  "/reports",
  "/settings",
  "/replace-tyre",
  "/expenditure",
];
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isProtected = PROTECTED_PATHS.some(
    (p) => (p === "/" && pathname === "/") || (p !== "/" && pathname.startsWith(p))
  );

  // Authenticated user visiting auth pages → redirect to dashboard
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user visiting protected pages → redirect to login
  if (!session && isProtected) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") {
      url.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};