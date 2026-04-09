"use client";

import { useState, useMemo } from "react";
import { InternalOrderStatus } from "@/lib/generated/prisma";
import {
  createInternalOrder,
  updateInternalOrderStatus,
  getInternalOrderHistory,
} from "@/lib/actions/internal-order.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, X, Filter, History,
  User, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string };

type InternalOrder = {
  id: string;
  productName: string;
  qty: number;
  distributor: string | null;
  note: string | null;
  status: InternalOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string;
  updatedBy: Worker;
};

type HistoryEntry = {
  id: string;
  status: InternalOrderStatus;
  note: string | null;
  changedAt: Date;
  changedBy: Worker;
};

type Props = { orders: InternalOrder[] };

// ─── Konstante ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<InternalOrderStatus, string> = {
  Kreirano: "Kreirano",
  Poručeno: "Poručeno",
  Stiglo:   "Stiglo",
  Završeno: "Završeno",
};

const STATUS_COLORS: Record<InternalOrderStatus, string> = {
  Kreirano: "bg-blue-100 text-blue-800",
  Poručeno: "bg-yellow-100 text-yellow-800",
  Stiglo:   "bg-green-100 text-green-800",
  Završeno: "bg-emerald-100 text-emerald-800",
};

const PAGE_SIZE = 25;
const emptyForm = { productName: "", qty: "1", distributor: "", note: "" };

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function InternalOrdersClient({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState<InternalOrder[]>(initialOrders);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "create"; data: typeof emptyForm }
    | { type: "status"; id: string; status: InternalOrderStatus }
    | null
  >(null);

  const [historyOrder, setHistoryOrder] = useState<InternalOrder | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<InternalOrderStatus | "sve">("sve");
  const [page, setPage] = useState(1);

  // ── Filtriranje ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.productName.toLowerCase().includes(search.toLowerCase()) ||
        o.distributor?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "sve" || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Forma ──────────────────────────────────────────────────────────────────

  const handleFormSubmit = () => {
    if (!form.productName.trim()) { setFormError("Naziv artikla je obavezan."); return; }
    if (Number(form.qty) < 1) { setFormError("Količina mora biti najmanje 1."); return; }
    setFormError("");
    setPendingAction({ type: "create", data: { ...form } });
    setPinOpen(true);
  };

  const handleStatusChange = (id: string, status: InternalOrderStatus) => {
    setPendingAction({ type: "status", id, status });
    setPinOpen(true);
  };

  // ── PIN potvrđen ───────────────────────────────────────────────────────────

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === "create") {
      const fd = new FormData();
      Object.entries(pendingAction.data).forEach(([k, v]) => fd.set(k, v));
      fd.set("workerId", worker.id);
      const result = await createInternalOrder(fd);
      if (result.success && result.order) {
        setOrders((prev) => [result.order as InternalOrder, ...prev]);
        setForm(emptyForm);
        setShowForm(false);
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "status") {
      const result = await updateInternalOrderStatus(pendingAction.id, pendingAction.status, worker.id);
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === pendingAction.id
              ? { ...o, status: pendingAction.status, updatedBy: { id: worker.id, name: worker.name } }
              : o
          )
        );
      }
    }

    setPendingAction(null);
  };

  // ── Historija ──────────────────────────────────────────────────────────────

  const openHistory = async (order: InternalOrder) => {
    setHistoryOrder(order);
    setHistoryLoading(true);
    const data = await getInternalOrderHistory(order.id);
    setHistory(data as HistoryEntry[]);
    setHistoryLoading(false);
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return (
      d.toLocaleDateString("sr-Latn") +
      " u " +
      d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit" })
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 space-y-5">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Narudžbine za apoteku</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ukupno</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showForm ? "Zatvori" : "Nova narudžbina"}
        </Button>
      </div>

      {/* Forma */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Nova narudžbina za apoteku</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="productName">Naziv artikla *</Label>
              <Input
                id="productName"
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                placeholder="npr. Brufen 400mg"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qty">Količina *</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="distributor">Dobavljač</Label>
              <Input
                id="distributor"
                value={form.distributor}
                onChange={(e) => setForm((f) => ({ ...f, distributor: e.target.value }))}
                placeholder="Opciono"
              />
            </div>
            <div className="space-y-1 lg:col-span-4">
              <Label htmlFor="note">Napomena</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Opciono"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline" size="sm"
              onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}
            >
              Odustani
            </Button>
            <Button size="sm" onClick={handleFormSubmit}>Sačuvaj</Button>
          </div>
        </div>
      )}

      {/* Filteri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pretraži po artiklu ili dobavljaču..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as InternalOrderStatus | "sve"); setPage(1); }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
          >
            <option value="sve">Svi statusi</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nema rezultata.</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    {["Artikal", "Kol.", "Dobavljač", "Napomena", "Datum", "Status", "Radnik", "Izmjeni", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginated.map((order) => (
                    <tr
                      key={order.id}
                      className={`hover:bg-muted/20 transition-colors ${order.status === "Završeno" ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`font-medium ${order.status === "Završeno" ? "line-through" : ""}`}>
                          {order.productName}
                        </span>
                      </td>
                      <td className="px-4 py-3">{order.qty}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.distributor || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.note || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("sr-Latn")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                          <User className="w-3 h-3 shrink-0" />
                          {order.updatedBy.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as InternalOrderStatus)}
                          className="text-xs h-8 rounded border border-input bg-background px-2 min-w-[110px]"
                        >
                          {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => openHistory(order)} title="Historija"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobilne kartice */}
            <div className="md:hidden divide-y">
              {paginated.map((order) => (
                <div
                  key={order.id}
                  className={`p-4 space-y-2 ${order.status === "Završeno" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-medium text-sm ${order.status === "Završeno" ? "line-through" : ""}`}>
                      {order.productName} × {order.qty}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  {order.distributor && (
                    <p className="text-xs text-muted-foreground">{order.distributor}</p>
                  )}
                  {order.note && (
                    <p className="text-xs text-muted-foreground">{order.note}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="w-3 h-3" /> {order.updatedBy.name}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as InternalOrderStatus)}
                      className="text-xs h-8 rounded border border-input bg-background px-2 flex-1"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" onClick={() => openHistory(order)}>
                      <History className="w-3.5 h-3.5 mr-1" /> Historija
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Paginacija */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Stranica {page} od {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronDown className="w-4 h-4 rotate-90" /> Prethodna
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Sljedeća <ChevronUp className="w-4 h-4 rotate-90" />
            </Button>
          </div>
        </div>
      )}

      {/* PIN modal */}
      <PinModal
        isOpen={pinOpen}
        title="Potvrdi identitet"
        description="Upiši svoj PIN da potvrdiš akciju."
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinOpen(false); setPendingAction(null); }}
      />

      {/* Historija modal */}
      {historyOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setHistoryOrder(null); }}
        >
          <div className="bg-background border rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold">{historyOrder.productName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historyOrder.qty} kom{historyOrder.distributor ? ` · ${historyOrder.distributor}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHistoryOrder(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <div className="text-center text-muted-foreground text-sm py-8">Učitavanje...</div>
              ) : history.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">Nema historije.</div>
              ) : (
                <div className="space-y-1">
                  {history.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                          {STATUS_LABELS[entry.status]}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium">{entry.changedBy.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
