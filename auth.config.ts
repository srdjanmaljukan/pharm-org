import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/sign-in",
    error:  "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname === "/sign-in";

      if (isAuthPage) {
        // Prijavljen korisnik ne treba da vidi login stranicu
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Sve ostale stranice zahtijevaju prijavu
      if (!isLoggedIn) {
        return Response.redirect(new URL("/sign-in", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
