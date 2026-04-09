"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag, AlertTriangle, Target, Footprints,
  Calendar, Bell, ChevronDown, Menu as MenuIcon, X,
  LogOut, Settings, MoreHorizontal, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { signOutUser } from "@/lib/actions/user.actions";

// ─── Navigacijski linkovi ─────────────────────────────────────────────────────

const mainLinks = [
  { href: "/porudzbine",         label: "Porudžbine", icon: ShoppingBag },
  { href: "/interne-narudzbine", label: "Za apoteku", icon: ShoppingBag },
  { href: "/reklamacije",        label: "Reklamacije", icon: AlertTriangle },
  { href: "/targeti",            label: "Targeti",     icon: Target },
];

const moreLinks = [
  { href: "/papuce",       label: "Papuče",           icon: Footprints },
  { href: "/raspored",     label: "Raspored vikenda", icon: Calendar },
  { href: "/notifikacije", label: "Notifikacije",     icon: Bell },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = { userName: string | null };

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function Menu({ userName }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen,   setMoreOpen]   = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const closeUser = useCallback(() => setUserOpen(false), []);

  useClickOutside(moreRef, closeMore);
  useClickOutside(userRef, closeUser);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive     = (href: string) => pathname === href;
  const isMoreActive = moreLinks.some((l) => pathname === l.href);

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/sign-in");
  };

  return (
    <>
      {/* ── Desktop ───────────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1">

        {/* Glavni linkovi */}
        {mainLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}

        {/* Više dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isMoreActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            Više
            <ChevronDown className={cn("w-3 h-3 transition-transform", moreOpen && "rotate-180")} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-background shadow-md z-50 py-1">
              {moreLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                    isActive(href)
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* User meni ili dugme za prijavu */}
        {userName ? (
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <ChevronDown className={cn("w-3 h-3 transition-transform", userOpen && "rotate-180")} />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border bg-background shadow-md z-50 py-1">
                {/* Ime usera */}
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground">Prijavljen kao</p>
                  <p className="text-sm font-medium truncate">{userName}</p>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Admin panel
                </Link>
                <div className="border-t my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Odjavi se
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button size="sm" asChild>
            <Link href="/sign-in">Prijavi se</Link>
          </Button>
        )}
      </div>

      {/* ── Mobilni hamburger ─────────────────────────────────────────────── */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Meni"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </Button>
      </div>

      {/* ── Mobilni meni — renderuje se kroz portal izvan headera ─────── */}
      {mobileOpen && typeof document !== "undefined" && createPortal(
        <div
          className="md:hidden fixed left-0 right-0 top-14 bottom-0 z-50 overflow-y-auto bg-white dark:bg-zinc-950"
        >
          <nav className="flex flex-col p-4 gap-1 min-h-full">

            {userName && (
              <div className="px-3 py-3 mb-1 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Prijavljen kao</p>
                <p className="text-sm font-medium">{userName}</p>
              </div>
            )}

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 mt-1">
              Kategorije
            </p>

            {[...mainLinks, ...moreLinks].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}

            <div className="border-t my-2" />

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
              Račun
            </p>

            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin panel
            </Link>

            {userName ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Odjavi se
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <User className="w-4 h-4" />
                Prijavi se
              </Link>
            )}
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
