import Link from "next/link";
import { getAllOrders } from "@/lib/actions/order.actions";
import { prisma } from "@/db/prisma";
import {
  ShoppingBag, AlertTriangle, Target,
  Footprints, Calendar, ChevronRight, Clock
} from "lucide-react";

const LIMIT = 5;

const statusColors: Record<string, string> = {
  Kreirano:               "bg-blue-100 text-blue-800",
  Poručeno:               "bg-yellow-100 text-yellow-800",
  Stiglo:                 "bg-green-100 text-green-800",
  Javljeno:               "bg-purple-100 text-purple-800",
  NeJavljaSe:             "bg-red-100 text-red-800",
  ProkucanoNijeNaplaćeno: "bg-orange-100 text-orange-800",
  NaplaćenoNijeProkucano: "bg-orange-100 text-orange-800",
  Ostalo:                 "bg-gray-100 text-gray-700",
  Završeno:               "bg-emerald-100 text-emerald-800",
};

export default async function Home() {
  const [latestOrders, reclamationCount, targetCount] = await Promise.all([
    getAllOrders(LIMIT),
    prisma.reclamation.count({ where: { status: { not: "Riješena" } } }),
    prisma.targetItem.count({ where: { isActive: true } }),
  ]);

  const categories = [
    {
      href: "/porudzbine",
      label: "Porudžbine",
      description: "Pacijentske narudžbine",
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      href: "/reklamacije",
      label: "Reklamacije",
      description: `${reclamationCount} otvorenih`,
      icon: AlertTriangle,
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    {
      href: "/targeti",
      label: "Targetirani artikli",
      description: `${targetCount} aktivnih`,
      icon: Target,
      color: "bg-green-50 text-green-600 border-green-100",
    },
    {
      href: "/papuce",
      label: "Papuče",
      description: "Zalihe po broju i boji",
      icon: Footprints,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      href: "/raspored",
      label: "Raspored vikenda",
      description: "Subota i nedjelja",
      icon: Calendar,
      color: "bg-teal-50 text-teal-600 border-teal-100",
    },
  ];

  return (
    <div className="py-8 space-y-8">
      {/* Kategorije */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Kategorije
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map(({ href, label, description, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-all ${color.split(" ")[0].replace("bg-", "hover:bg-").replace("50", "100/50")}`}
            >
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Zadnje porudžbine */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Posljednjih {LIMIT} porudžbina
          </h2>
          <Link
            href="/porudzbine"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Vidi sve <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {latestOrders.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
            Nema porudžbina.
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {latestOrders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors ${
                  order.status === "Završeno" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${order.status === "Završeno" ? "line-through" : ""}`}>
                      {order.productName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.personName || "—"} · {order.phoneNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleDateString("sr-Latn")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
