"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ShoppingBag, AlertTriangle, Target, Footprints, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/porudzbine",       label: "Porudžbine",  icon: ShoppingBag },
  { href: "/reklamacije",      label: "Reklamacije", icon: AlertTriangle },
  { href: "/targeti",          label: "Targeti",     icon: Target },
  { href: "/papuce",           label: "Papuče",      icon: Footprints },
  { href: "/raspored",         label: "Raspored",    icon: Calendar },
];

const Menu = () => {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1">
      {/* Desktop navigacija */}
      <nav className="hidden md:flex items-center gap-1 mr-2">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Notifikacije */}
      <Button variant="ghost" size="icon" asChild className="relative">
        <Link href="/notifikacije">
          <Bell className="w-4 h-4" />
        </Link>
      </Button>

      {/* Admin */}
      <Button variant="ghost" size="icon" asChild>
        <Link href="/admin/radnici">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
};

export default Menu;
