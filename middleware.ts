import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Zaštiti sve rute osim:
     * - _next/static (statički fajlovi)
     * - _next/image (optimizacija slika)
     * - favicon.ico
     * - api/auth (NextAuth rute)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
