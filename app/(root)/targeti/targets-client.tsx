"use client";

import { useState } from "react";
import {
  createTargetItem,
  deleteTargetItem,
  addSaleEntry,
  deleteSaleEntry,
  getTargetItems,
} from "@/lib/actions/target.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { WorkerRole } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, X, ChevronDown, ChevronUp,
  Trash2, Target, CheckCircle2,
} from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string };

type SaleEntry = {
  id: string;
  qtySold: number;
  note: string | null;
  enteredAt: Date;
  enteredBy: Worker;
};

type TargetItem = {
  id: string;
  productName: string;
  minQty: number;
  month: number;
  year: number;
  entries: SaleEntry[];
};

type Props = {
  items: TargetItem[];
  currentMonth: number;
  currentYear: number;
};

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function TargetsClient({ items: initialItems, currentMonth, currentYear }: Props) {
  const [items, setItems] = useState<TargetItem[]>(initialItems);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear]   = useState(currentYear);
  const [loading, setLoading] = useState(false);

  // Admin forma za novi artikal
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ productName: "", minQty: "1" });
  const [addError, setAddError] = useState("");

  // Forma za unos prodaje (po artiklu)
  const [saleForm, setSaleForm] = useState<Record<string, { qty: string; note: string }>>({});

  // Expanded state za historiju unosa
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // PIN modal
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "addItem" }
    | { type: "deleteItem"; id: string }
    | { type: "addSale"; targetItemId: string; qty: number; note: string }
    | { type: "deleteSale"; entryId: string; targetItemId: string }
    | null
  >(null);
  const [adminRequired, setAdminRequired] = useState(false);

  // ── Navigacija po mjesecima ────────────────────────────────────────────────

  const navigateMonth = async (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setMonth(m);
    setYear(y);
    setLoading(true);
    const data = await getTargetItems(m, y);
    setItems(data as TargetItem[]);
    setLoading(false);
  };

  // ── Dodavanje artikla (admin) ──────────────────────────────────────────────

  const handleAddItem = () => {
    if (!addForm.productName.trim()) { setAddError("Naziv je obavezan."); return; }
    if (Number(addForm.minQty) < 1)  { setAddError("Minimalna količina mora biti najmanje 1."); return; }
    setAddError("");
    setAdminRequired(true);
    setPendingAction({ type: "addItem" });
    setPinOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setAdminRequired(true);
    setPendingAction({ type: "deleteItem", id });
    setPinOpen(true);
  };

  // ── Unos prodaje (svi radnici) ─────────────────────────────────────────────

  const handleAddSale = (targetItemId: string) => {
    const form = saleForm[targetItemId];
    const qty  = Number(form?.qty || 0);
    if (!qty || qty < 1) return;
    setAdminRequired(false);
    setPendingAction({ type: "addSale", targetItemId, qty, note: form?.note || "" });
    setPinOpen(true);
  };

  const handleDeleteSale = (entryId: string, targetItemId: string) => {
    setAdminRequired(false);
    setPendingAction({ type: "deleteSale", entryId, targetItemId });
    setPinOpen(true);
  };

  // ── PIN potvrđen ───────────────────────────────────────────────────────────

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (!pendingAction) return;

    // Admin akcije — provjeri rolu
    if (adminRequired && worker.role !== WorkerRole.ADMIN) {
      alert("Samo admin radnik može upravljati targetima.");
      setPendingAction(null);
      return;
    }

    if (pendingAction.type === "addItem") {
      const fd = new FormData();
      fd.set("productName", addForm.productName.trim());
      fd.set("minQty", addForm.minQty);
      fd.set("month", String(month));
      fd.set("year", String(year));
      const result = await createTargetItem(fd);
      if (result.success) {
        const data = await getTargetItems(month, year);
        setItems(data as TargetItem[]);
        setAddForm({ productName: "", minQty: "1" });
        setShowAddForm(false);
      } else {
        setAddError(result.message);
      }
    }

    if (pendingAction.type === "deleteItem") {
      const result = await deleteTargetItem(pendingAction.id);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== pendingAction.id));
      }
    }

    if (pendingAction.type === "addSale") {
      const result = await addSaleEntry(
        pendingAction.targetItemId,
        pendingAction.qty,
        worker.id,
        pendingAction.note
      );
      if (result.success && result.entry) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === pendingAction.targetItemId
              ? { ...item, entries: [result.entry as SaleEntry, ...item.entries] }
              : item
          )
        );
        setSaleForm((prev) => ({ ...prev, [pendingAction.targetItemId]: { qty: "", note: "" } }));
      }
    }

    if (pendingAction.type === "deleteSale") {
      const result = await deleteSaleEntry(pendingAction.entryId);
      if (result.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === pendingAction.targetItemId
              ? { ...item, entries: item.entries.filter((e) => e.id !== pendingAction.entryId) }
              : item
          )
        );
      }
    }

    setPendingAction(null);
    setAdminRequired(false);
  };

  // ── Izračunaj ukupno prodato ───────────────────────────────────────────────

  const totalSold = (item: TargetItem) =>
    item.entries.reduce((sum, e) => sum + e.qtySold, 0);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("sr-Latn");

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 space-y-6">

      {/* Zaglavlje sa navigacijom po mjesecima */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Targetirani artikli</h1>
          <p className="text-sm text-muted-foreground">
            {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} disabled={loading}>
            <ChevronDown className="w-4 h-4 rotate-90" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} disabled={loading}>
            <ChevronUp className="w-4 h-4 rotate-90" />
          </Button>
          <Button size="sm" onClick={() => setShowAddForm((v) => !v)} className="ml-2">
            {showAddForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
            {showAddForm ? "Zatvori" : "Dodaj artikal"}
          </Button>
        </div>
      </div>

      {/* Admin forma za novi artikal */}
      {showAddForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Novi target artikal — {MONTHS[month - 1]} {year}</h2>
          <p className="text-sm text-muted-foreground">Samo admin radnik može dodavati artikle.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="productName">Naziv artikla *</Label>
              <Input
                id="productName"
                value={addForm.productName}
                onChange={(e) => setAddForm((f) => ({ ...f, productName: e.target.value }))}
                placeholder="npr. Omega-3 kapsule"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minQty">Minimalna količina *</Label>
              <Input
                id="minQty"
                type="number"
                min={1}
                value={addForm.minQty}
                onChange={(e) => setAddForm((f) => ({ ...f, minQty: e.target.value }))}
              />
            </div>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowAddForm(false); setAddError(""); }}>
              Odustani
            </Button>
            <Button size="sm" onClick={handleAddItem}>Sačuvaj</Button>
          </div>
        </div>
      )}

      {/* Lista targeta */}
      {loading ? (
        <div className="text-center text-muted-foreground py-16">Učitavanje...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Target className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Nema targetiranih artikala za {MONTHS[month - 1]} {year}.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Klikni &ldquo;Dodaj artikal&rdquo; da dodaš prvi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const sold      = totalSold(item);
            const percent   = Math.min(100, Math.round((sold / item.minQty) * 100));
            const done      = sold >= item.minQty;
            const sf        = saleForm[item.id] || { qty: "", note: "" };
            const isExpanded = expanded[item.id];

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-card overflow-hidden transition-all ${done ? "border-emerald-200" : ""}`}
              >
                {/* Artikal header */}
                <div className={`px-5 py-4 ${done ? "bg-emerald-50/50" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {done && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                        <h3 className={`font-medium ${done ? "text-emerald-800" : ""}`}>
                          {item.productName}
                        </h3>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Prodato: <span className="font-medium text-foreground">{sold}</span> / {item.minQty}
                          </span>
                          <span className={`font-medium ${done ? "text-emerald-700" : percent >= 75 ? "text-yellow-700" : "text-muted-foreground"}`}>
                            {percent}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : percent >= 75 ? "bg-yellow-500" : "bg-primary"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Ukloni artikal (admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Forma za unos prodaje */}
                  <div className="mt-4 flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Količina"
                      value={sf.qty}
                      onChange={(e) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          [item.id]: { ...sf, qty: e.target.value },
                        }))
                      }
                      className="w-28 h-8 text-sm"
                    />
                    <Input
                      placeholder="Napomena (opciono)"
                      value={sf.note}
                      onChange={(e) =>
                        setSaleForm((prev) => ({
                          ...prev,
                          [item.id]: { ...sf, note: e.target.value },
                        }))
                      }
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleAddSale(item.id)}
                      disabled={!sf.qty || Number(sf.qty) < 1}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Unesi
                    </Button>
                  </div>
                </div>

                {/* Historija unosa */}
                {item.entries.length > 0 && (
                  <div className="border-t">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))}
                      className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      <span>{item.entries.length} {item.entries.length === 1 ? "unos" : "unosa"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                      <div className="divide-y border-t bg-muted/20">
                        {item.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between px-5 py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm font-medium shrink-0">+{entry.qtySold}</span>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground truncate">
                                  {entry.enteredBy.name} · {formatDate(entry.enteredAt)}
                                </p>
                                {entry.note && (
                                  <p className="text-xs text-muted-foreground truncate italic">{entry.note}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => handleDeleteSale(entry.id, item.id)}
                              title="Obriši unos"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PIN modal */}
      <PinModal
        isOpen={pinOpen}
        title={adminRequired ? "Admin potvrda" : "Potvrdi identitet"}
        description={
          adminRequired
            ? "Ovu akciju može izvršiti samo admin radnik."
            : "Upiši svoj PIN da potvrdiš unos."
        }
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinOpen(false); setPendingAction(null); setAdminRequired(false); }}
      />
    </div>
  );
}
