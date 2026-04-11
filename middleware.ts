import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isSignInPage = req.nextUrl.pathname === "/sign-in";

  if (!isLoggedIn && !isSignInPage) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
  }

  if (isLoggedIn && isSignInPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
