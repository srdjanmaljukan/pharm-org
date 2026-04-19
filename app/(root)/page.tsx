import Link from "next/link";
import { prisma } from "@/db/prisma";
import {
  ShoppingBag, AlertTriangle, Target, Footprints,
  Calendar, ChevronRight, Clock, Bell, Package, User,
} from "lucide-react";

const LIMIT = 5;

const orderStatusColors: Record<string, string> = {
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

const reclamationStatusColors: Record<string, string> = {
  Otvorena: "bg-red-100 text-red-800",
  UProcesу: "bg-yellow-100 text-yellow-800",
  Riješena: "bg-emerald-100 text-emerald-800",
  Odbijena: "bg-gray-100 text-gray-700",
};

export default async function Home() {
  const now = new Date();

  const [
    latestOrders,
    latestInternalOrders,
    latestReclamations,
    activeNotifications,
    // Statistike za kartice
    openOrdersCount,
    openReclamationsCount,
    activeTargetsCount,
    lowStockSlippers,
    upcomingShift,
    pendingInternalOrders,
  ] = await Promise.all([
    // Zadnjih 5 pacijentskih porudžbina
    prisma.order.findMany({
      take: LIMIT,
      orderBy: { createdAt: "desc" },
      include: { updatedBy: { select: { name: true } } },
    }),
    // Zadnjih 5 internih narudžbina
    prisma.internalOrder.findMany({
      take: LIMIT,
      where: { status: { not: "Završeno" } },
      orderBy: { createdAt: "desc" },
    }),
    // Zadnjih 5 reklamacija
    prisma.reclamation.findMany({
      take: LIMIT,
      where: { status: { not: "Riješena" } },
      orderBy: { createdAt: "desc" },
    }),
    // Aktivne notifikacije (rok istekao, nije završeno)
    prisma.notification.findMany({
      where: { status: "NijeZavrseno", remindAt: { lte: now } },
      orderBy: { remindAt: "asc" },
      take: 3,
    }),
    // Broj otvorenih porudžbina (nije završeno)
    prisma.order.count({ where: { status: { not: "Završeno" } } }),
    // Broj otvorenih reklamacija
    prisma.reclamation.count({ where: { status: { notIn: ["Riješena", "Odbijena"] } } }),
    // Aktivni targeti ovog mjeseca
    prisma.targetItem.count({
      where: {
        isActive: true,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    }),
    // Papuče sa malo na stanju (≤2 para, nije 0)
    prisma.slipperVariant.count({ where: { qty: { gt: 0, lte: 2 } } }),
    // Sljedeći vikend (subota)
    prisma.cycleStart.findFirst({ orderBy: { createdAt: "desc" } }),
    // Interne narudžbine na čekanju
    prisma.internalOrder.count({ where: { status: { in: ["Kreirano", "Poručeno"] } } }),
  ]);

  const categories = [
    {
      href: "/porudzbine",
      label: "Porudžbine",
      description: `${openOrdersCount} aktivnih`,
      icon: ShoppingBag,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      alert: openOrdersCount > 0,
    },
    {
      href: "/interne-narudzbine",
      label: "Za apoteku",
      description: `${pendingInternalOrders} na čekanju`,
      icon: Package,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      alert: pendingInternalOrders > 0,
    },
    {
      href: "/reklamacije",
      label: "Reklamacije",
      description: `${openReclamationsCount} otvorenih`,
      icon: AlertTriangle,
      color: "bg-orange-50 text-orange-600 border-orange-100",
      alert: openReclamationsCount > 0,
    },
    {
      href: "/targeti",
      label: "Targeti",
      description: `${activeTargetsCount} aktivnih`,
      icon: Target,
      color: "bg-green-50 text-green-600 border-green-100",
      alert: false,
    },
    {
      href: "/papuce",
      label: "Papuče",
      description: lowStockSlippers > 0 ? `${lowStockSlippers} malo na stanju` : "Zalihe uredne",
      icon: Footprints,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      alert: lowStockSlippers > 0,
    },
    {
      href: "/raspored",
      label: "Raspored",
      description: "Vikend smjene",
      icon: Calendar,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      alert: false,
    },
    {
      href: "/notifikacije",
      label: "Notifikacije",
      description: activeNotifications.length > 0
        ? `${activeNotifications.length} čeka odgovor`
        : "Nema aktivnih",
      icon: Bell,
      color: "bg-rose-50 text-rose-600 border-rose-100",
      alert: activeNotifications.length > 0,
    },
  ];

  return (
    <div className="py-6 space-y-8">

      {/* Kartice kategorija */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Pregled
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {categories.map(({ href, label, description, icon: Icon, color, alert }) => (
            <Link
              key={href}
              href={href}
              className="relative group flex flex-col gap-2 p-3 rounded-xl border bg-card hover:shadow-md transition-all"
            >
              {alert && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
              )}
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm leading-tight">{label}</p>
                <p className={`text-xs mt-0.5 ${alert ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Aktivne notifikacije — ako ih ima */}
      {activeNotifications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-red-500" />
              Notifikacije koje čekaju
            </h2>
            <Link href="/notifikacije" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Vidi sve <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden divide-y border-l-4 border-l-red-400">
            {activeNotifications.map((n) => {
              const priorityColor =
                n.priority === "Hitno" ? "text-red-600" :
                n.priority === "Bitno" ? "text-yellow-700" : "text-blue-600";
              return (
                <Link
                  key={n.id}
                  href="/notifikacije"
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  <span className={`text-xs font-medium shrink-0 ml-3 ${priorityColor}`}>
                    {n.priority}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Dvije kolone — porudžbine i interne narudžbine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pacijentske porudžbine */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Zadnje porudžbine
            </h2>
            <Link href="/porudzbine" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Vidi sve <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {latestOrders.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nema porudžbina.</div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden divide-y">
              {latestOrders.map((order) => (
                <div
                  key={order.id}
                  className={`px-4 py-3 hover:bg-muted/20 transition-colors ${order.status === "Završeno" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${order.status === "Završeno" ? "line-through" : ""}`}>
                        {order.productName}
                        <span className="text-muted-foreground font-normal ml-1.5">× {order.qty}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {order.personName || "—"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />{order.updatedBy.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString("sr-Latn")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interne narudžbine na čekanju */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Narudžbine za apoteku
            </h2>
            <Link href="/interne-narudzbine" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Vidi sve <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {latestInternalOrders.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nema narudžbina na čekanju.</div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden divide-y">
              {latestInternalOrders.map((order) => (
                <div key={order.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {order.productName}
                      <span className="text-muted-foreground font-normal ml-1.5">× {order.qty}</span>
                    </p>
                    {order.distributor && (
                      <p className="text-xs text-muted-foreground">{order.distributor}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    order.status === "Kreirano" ? "bg-blue-100 text-blue-800" :
                    order.status === "Poručeno" ? "bg-yellow-100 text-yellow-800" :
                    order.status === "Stiglo"   ? "bg-green-100 text-green-800" :
                    "bg-emerald-100 text-emerald-800"
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reklamacije */}
      {latestReclamations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Otvorene reklamacije
            </h2>
            <Link href="/reklamacije" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Vidi sve <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden divide-y">
            {latestReclamations.map((rec) => (
              <div key={rec.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{rec.productName}</p>
                  <p className="text-xs text-muted-foreground">{rec.distributor} · {rec.reason}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${reclamationStatusColors[rec.status] || "bg-gray-100 text-gray-700"}`}>
                  {rec.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
