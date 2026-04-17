"use client";

import { useState, useMemo } from "react";
import { SlipperType } from "@/lib/generated/prisma";
import {
  createSlipperVariant,
  updateSlipperQty,
  sellSlippers,
  deleteSlipperVariant,
} from "@/lib/actions/slipper.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { WorkerRole } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Trash2, Minus, Sun, Snowflake, ShieldCheck } from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string };

type SaleLog = {
  id: string;
  qtySold: number;
  soldAt: Date;
  soldBy: Worker;
};

type Slipper = {
  id: string;
  type: SlipperType;
  size: number;
  color: string;
  qty: number;
  updatedAt: Date;
  updatedBy: Worker;
  salesLog: SaleLog[];
};

type Props = { slippers: Slipper[] };

const emptyForm = { type: "Letnje" as SlipperType, size: "", color: "", qty: "0" };

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function SlippersClient({ slippers: initialSlippers }: Props) {
  const [slippers, setSlippers] = useState<Slipper[]>(initialSlippers);
  const [activeTab, setActiveTab] = useState<SlipperType>(SlipperType.Letnje);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [formError, setFormError] = useState("");

  // Sell modal state (po varijanti)
  const [sellVariantId, setSellVariantId] = useState<string | null>(null);
  const [sellQty, setSellQty]             = useState("1");
  const [sellError, setSellError]         = useState("");

  // Edit qty (admin)
  const [editVariantId, setEditVariantId] = useState<string | null>(null);
  const [editQty, setEditQty]             = useState("");

  // PIN modal
  const [pinOpen, setPinOpen]         = useState(false);
  const [adminRequired, setAdminRequired] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "create" }
    | { type: "sell"; variantId: string; qty: number }
    | { type: "editQty"; variantId: string; qty: number }
    | { type: "delete"; variantId: string }
    | null
  >(null);

  // Filtrirane papuče po tipu
  const filtered = useMemo(
    () => slippers.filter((s) => s.type === activeTab),
    [slippers, activeTab]
  );

  // Jedinstvene boje i veličine za tabelu
  const colors = useMemo(
    () => [...new Set(filtered.map((s) => s.color))].sort(),
    [filtered]
  );
  const sizes = useMemo(
    () => [...new Set(filtered.map((s) => s.size))].sort((a, b) => a - b),
    [filtered]
  );

  // Mapa za brzi pristup: "size-color" -> slipper
  const slipperMap = useMemo(() => {
    const m = new Map<string, Slipper>();
    filtered.forEach((s) => m.set(`${s.size}-${s.color}`, s));
    return m;
  }, [filtered]);

  // ── Akcije ─────────────────────────────────────────────────────────────────

  const triggerAction = (
    action: typeof pendingAction,
    requireAdmin = false
  ) => {
    setPendingAction(action);
    setAdminRequired(requireAdmin);
    setPinOpen(true);
  };

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (!pendingAction) return;

    if (adminRequired && worker.role !== WorkerRole.ADMIN) {
      setFormError("Samo admin radnik može ovu akciju.");
      setPendingAction(null);
      return;
    }

    if (pendingAction.type === "create") {
      if (!form.size || !form.color.trim()) { setFormError("Sva polja su obavezna."); return; }
      const fd = new FormData();
      fd.set("type", form.type);
      fd.set("size", form.size);
      fd.set("color", form.color.trim());
      fd.set("qty", form.qty);
      fd.set("workerId", worker.id);
      const result = await createSlipperVariant(fd);
      if (result.success) {
        window.location.reload();
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "sell") {
      const result = await sellSlippers(pendingAction.variantId, pendingAction.qty, worker.id);
      if (result.success) {
        setSlippers((prev) =>
          prev.map((s) =>
            s.id === pendingAction.variantId
              ? { ...s, qty: result.newQty ?? s.qty - pendingAction.qty, updatedBy: { id: worker.id, name: worker.name } }
              : s
          )
        );
        setSellVariantId(null);
        setSellQty("1");
        setSellError("");
      } else {
        setSellError(result.message);
      }
    }

    if (pendingAction.type === "editQty") {
      const result = await updateSlipperQty(pendingAction.variantId, pendingAction.qty, worker.id);
      if (result.success) {
        setSlippers((prev) =>
          prev.map((s) =>
            s.id === pendingAction.variantId
              ? { ...s, qty: pendingAction.qty, updatedBy: { id: worker.id, name: worker.name } }
              : s
          )
        );
        setEditVariantId(null);
      }
    }

    if (pendingAction.type === "delete") {
      const result = await deleteSlipperVariant(pendingAction.variantId);
      if (result.success) {
        setSlippers((prev) => prev.filter((s) => s.id !== pendingAction.variantId));
      }
    }

    setPendingAction(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabClass = (t: SlipperType) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      activeTab === t
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <div className="py-6 space-y-5">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Papuče</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showForm ? "Zatvori" : "Dodaj varijantu"}
        </Button>
      </div>

      {/* Admin info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        Dodavanje i brisanje varijanti zahtijeva admin PIN. Prodaja zahtijeva PIN bilo kojeg radnika.
      </div>

      {/* Forma za novu varijantu */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Nova varijanta papuče</h2>
          <p className="text-sm text-muted-foreground">Zahtijeva admin PIN.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="slipType">Tip</Label>
              <select
                id="slipType"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SlipperType }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Letnje">Letnje</option>
                <option value="Zimske">Zimske</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="slipSize">Broj</Label>
              <Input
                id="slipSize"
                type="number"
                min={36} max={47}
                placeholder="npr. 38"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("slipColor")?.focus(); }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slipColor">Boja</Label>
              <Input
                id="slipColor"
                placeholder="npr. plava"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("slipQty")?.focus(); }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slipQty">Količina</Label>
              <Input
                id="slipQty"
                type="number"
                min={0}
                placeholder="0"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") triggerAction({ type: "create" }, true); }}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setFormError(""); }}>Odustani</Button>
            <Button size="sm" onClick={() => triggerAction({ type: "create" }, true)}>Sačuvaj</Button>
          </div>
        </div>
      )}

      {/* Tab selektor */}
      <div className="flex gap-2 border-b pb-1">
        <button className={tabClass(SlipperType.Letnje)} onClick={() => setActiveTab(SlipperType.Letnje)}>
          <Sun className="w-3.5 h-3.5" /> Letnje
        </button>
        <button className={tabClass(SlipperType.Zimske)} onClick={() => setActiveTab(SlipperType.Zimske)}>
          <Snowflake className="w-3.5 h-3.5" /> Zimske
        </button>
      </div>

      {/* Tabelarni prikaz */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          Nema {activeTab === SlipperType.Letnje ? "ljetnih" : "zimskih"} papuča u inventaru.
          <br />
          <span className="text-xs mt-1 block">Klikni &ldquo;Dodaj varijantu&rdquo; da dodaš prvu.</span>
        </div>
      ) : colors.length > 0 && sizes.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground sticky left-0 bg-muted/50 min-w-[80px]">
                    Br. \ Boja
                  </th>
                  {colors.map((color) => (
                    <th key={color} className="text-center px-3 py-3 font-medium text-muted-foreground capitalize min-w-[100px]">
                      {color}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sizes.map((size) => (
                  <tr key={size} className="hover:bg-muted/10">
                    <td className="px-4 py-3 font-semibold sticky left-0 bg-background border-r">
                      {size}
                    </td>
                    {colors.map((color) => {
                      const slipper = slipperMap.get(`${size}-${color}`);
                      if (!slipper) {
                        return (
                          <td key={color} className="px-3 py-3 text-center text-muted-foreground/30 text-xs">
                            —
                          </td>
                        );
                      }

                      const isEditing  = editVariantId === slipper.id;
                      const isSelling  = sellVariantId === slipper.id;

                      return (
                        <td key={color} className="px-2 py-2">
                          <div className="flex flex-col items-center gap-1.5">
                            {/* Količina */}
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="h-7 w-16 text-xs text-center"
                                  autoFocus
                                />
                                <Button
                                  size="icon" className="h-7 w-7"
                                  onClick={() => triggerAction({ type: "editQty", variantId: slipper.id, qty: Number(editQty) }, true)}
                                >
                                  ✓
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setEditVariantId(null)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditVariantId(slipper.id); setEditQty(String(slipper.qty)); }}
                                className={`text-lg font-bold tabular-nums cursor-pointer hover:opacity-70 transition-opacity ${
                                  slipper.qty === 0 ? "text-muted-foreground/40 line-through" : slipper.qty <= 2 ? "text-orange-600" : "text-foreground"
                                }`}
                                title="Klikni za izmjenu količine (admin)"
                              >
                                {slipper.qty}
                              </button>
                            )}

                            {/* Dugmad */}
                            {!isEditing && (
                              <div className="flex items-center gap-1">
                                {/* Prodaj */}
                                {isSelling ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={slipper.qty}
                                      value={sellQty}
                                      onChange={(e) => setSellQty(e.target.value)}
                                      className="h-6 w-12 text-xs text-center"
                                      autoFocus
                                    />
                                    <Button
                                      size="icon" className="h-6 w-6 text-xs"
                                      onClick={() => {
                                        setSellError("");
                                        triggerAction({ type: "sell", variantId: slipper.id, qty: Number(sellQty) });
                                      }}
                                      disabled={!sellQty || Number(sellQty) < 1}
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-6"
                                      onClick={() => { setSellVariantId(null); setSellError(""); }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline" size="icon"
                                    className="h-6 w-6"
                                    title="Prodaj"
                                    disabled={slipper.qty === 0}
                                    onClick={() => { setSellVariantId(slipper.id); setSellQty("1"); }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                )}
                                {/* Obriši */}
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-6 w-6 text-muted-foreground/40 hover:text-destructive"
                                  title="Obriši varijantu (admin)"
                                  onClick={() => triggerAction({ type: "delete", variantId: slipper.id }, true)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}

                            {/* Greška pri prodaji */}
                            {isSelling && sellError && (
                              <p className="text-xs text-destructive text-center">{sellError}</p>
                            )}

                            {/* Ko je zadnji mijenjao */}
                            <p className="text-xs text-muted-foreground/60 text-center leading-tight">
                              {slipper.updatedBy.name}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          <div className="px-4 py-3 border-t bg-muted/20 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-orange-600">3</span> — malo na stanju (≤2)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground/40 line-through">0</span> — rasprodano
            </span>
            <span>Klikni na broj za izmjenu zalihe (admin PIN)</span>
            <span><Minus className="w-3 h-3 inline" /> — označi prodaju (radnik PIN)</span>
          </div>
        </div>
      ) : null}

      {/* PIN modal */}
      <PinModal
        isOpen={pinOpen}
        title={adminRequired ? "Admin potvrda" : "Potvrdi identitet"}
        description={
          adminRequired
            ? "Ovu akciju može izvršiti samo admin radnik."
            : "Upiši PIN da potvrdiš prodaju."
        }
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinOpen(false); setPendingAction(null); setAdminRequired(false); }}
      />
    </div>
  );
}
