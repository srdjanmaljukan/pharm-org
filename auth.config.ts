import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/sign-in",
    error:  "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn   = !!auth?.user;
      const isAuthPage   = nextUrl.pathname.startsWith("/sign-in");

      // Na auth stranicama — ako je već prijavljen, idi na homepage
      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Na svim ostalim stranicama — ako nije prijavljen, idi na prijavu
      if (!isLoggedIn) {
        return Response.redirect(new URL("/sign-in", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
