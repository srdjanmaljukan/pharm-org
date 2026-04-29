"use client";

import { useState, useMemo } from "react";
import { ReclamationStatus, ReclamationDistributorType } from "@/lib/generated/prisma";
import {
  createReclamation,
  updateReclamationStatus,
  type ReclamationItemInput,
} from "@/lib/actions/reclamation.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus, X, Filter, History, User,
  ChevronDown, ChevronUp, Mail, Trash2,
} from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string };

type RecItem = {
  id: string;
  productName: string;
  qty: number;
  reason: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
};

type HistoryEntry = {
  id: string;
  status: ReclamationStatus;
  note: string | null;
  changedAt: Date;
  changedBy: Worker;
};

type Reclamation = {
  id: string;
  distributorName: string;
  distributorType: ReclamationDistributorType;
  invoiceNumber: string | null;
  reason: string | null;
  note: string | null;
  status: ReclamationStatus;
  createdAt: Date;
  createdBy: Worker;
  updatedBy: Worker | null;
  items: RecItem[];
  history: HistoryEntry[];
};

type MailTemplate = {
  id: string;
  distributorName: string;
  toEmail: string;
  subject: string;
  bodyTemplate: string;
};

type Props = {
  reclamations: Reclamation[];
  templates: MailTemplate[];
};

// ─── Konstante ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ReclamationStatus, string> = {
  Otvorena: "Otvorena",
  UProcesу: "U procesu",
  Riješena: "Riješena",
  Odbijena: "Odbijena",
};

const STATUS_COLORS: Record<ReclamationStatus, string> = {
  Otvorena: "bg-red-100 text-red-800",
  UProcesу: "bg-yellow-100 text-yellow-800",
  Riješena: "bg-emerald-100 text-emerald-800",
  Odbijena: "bg-gray-100 text-gray-700",
};

// Predefinisani dobavljači — tip određuje koja se polja traže
const DISTRIBUTORS = [
  { name: "Sopharma",          type: ReclamationDistributorType.Sopharma,         hasEmail: true },
  { name: "Centralni Magacin", type: ReclamationDistributorType.CentralniMagacin, hasEmail: true },
  { name: "Phoenix Pharma",    type: ReclamationDistributorType.Ostalo,            hasEmail: false },
  { name: "Vega doo",          type: ReclamationDistributorType.Ostalo,            hasEmail: false },
  { name: "Farmalogist",       type: ReclamationDistributorType.Ostalo,            hasEmail: false },
  { name: "Drugi...",          type: ReclamationDistributorType.Ostalo,            hasEmail: false },
];

const PAGE_SIZE = 20;

const emptyItem = (): ReclamationItemInput => ({
  productName: "", qty: 1, reason: "", batchNumber: "", expiryDate: "",
});

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function ReclamationsClient({ reclamations: initialData, templates }: Props) {
  const [reclamations, setReclamations] = useState<Reclamation[]>(initialData);
  const [showForm, setShowForm]         = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReclamationStatus | "sve">("sve");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);

  // Forma state
  const [distName, setDistName]     = useState("");
  const [customDist, setCustomDist] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [generalReason, setGeneralReason] = useState("");
  const [note, setNote]             = useState("");
  const [items, setItems]           = useState<ReclamationItemInput[]>([emptyItem()]);
  const [formError, setFormError]   = useState("");

  // Historija modal
  const [historyRec, setHistoryRec]   = useState<Reclamation | null>(null);
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});

  // PIN
  const [pinOpen, setPinOpen]         = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "create" }
    | { type: "status"; id: string; status: ReclamationStatus }
    | null
  >(null);

  // ── Izvedeni state ─────────────────────────────────────────────────────────

  const selectedDist = DISTRIBUTORS.find((d) => d.name === distName);
  const isSopharmaType =
    selectedDist?.type === ReclamationDistributorType.Sopharma ||
    selectedDist?.type === ReclamationDistributorType.CentralniMagacin;
  const hasEmailTemplate = templates.find(
    (t) => t.distributorName === (distName === "Drugi..." ? customDist : distName)
  );
  const actualDistName = distName === "Drugi..." ? customDist : distName;

  // ── Filtriranje ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return reclamations.filter((r) => {
      const matchSearch =
        !search ||
        r.distributorName.toLowerCase().includes(search.toLowerCase()) ||
        r.items.some((i) => i.productName.toLowerCase().includes(search.toLowerCase())) ||
        r.invoiceNumber?.includes(search);
      const matchStatus = filterStatus === "sve" || r.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [reclamations, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Forma ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setDistName(""); setCustomDist(""); setInvoiceNumber("");
    setGeneralReason(""); setNote(""); setItems([emptyItem()]); setFormError("");
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const updateItem = (idx: number, field: keyof ReclamationItemInput, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    if (!actualDistName.trim()) return "Odaberi dobavljača.";
    if (!invoiceNumber.trim()) return "Broj fakture je obavezan.";
    for (const item of items) {
      if (!item.productName.trim()) return "Naziv artikla je obavezan.";
      if (!item.qty || item.qty < 1) return "Količina mora biti najmanje 1.";
      if (!isSopharmaType && !item.reason?.trim()) return "Razlog je obavezan za svaki artikal.";
    }
    return null;
  };

  const handleFormSubmit = () => {
    const err = validateForm();
    if (err) { setFormError(err); return; }
    setFormError("");
    setPendingAction({ type: "create" });
    setPinOpen(true);
  };

  // ── PIN potvrđen ──────────────────────────────────────────────────────────

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === "create") {
      const result = await createReclamation({
        distributorName: actualDistName,
        distributorType: selectedDist?.type || ReclamationDistributorType.Ostalo,
        invoiceNumber:   invoiceNumber || undefined,
        reason:          generalReason || undefined,
        note:            note || undefined,
        workerId:        worker.id,
        items,
      });

      if (result.success && result.reclamation) {
        setReclamations((prev) => [result.reclamation as Reclamation, ...prev]);
        resetForm();
        setShowForm(false);
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "status") {
      const result = await updateReclamationStatus(pendingAction.id, pendingAction.status, worker.id);
      if (result.success) {
        setReclamations((prev) =>
          prev.map((r) =>
            r.id === pendingAction.id
              ? { ...r, status: pendingAction.status, updatedBy: { id: worker.id, name: worker.name } }
              : r
          )
        );
      }
    }

    setPendingAction(null);
  };

  // ── Mail ──────────────────────────────────────────────────────────────────

  const handleSendMail = (rec: Reclamation) => {
    const template = templates.find((t) => t.distributorName === rec.distributorName);
    if (!template) return;

    // Generiši listu artikala
    const itemsList = rec.items.map((item, i) => {
      let line = `${i + 1}. ${item.productName}, kol. ${item.qty}`;
      if (item.batchNumber) line += `, serija: ${item.batchNumber}`;
      if (item.expiryDate)  line += `, rok: ${item.expiryDate}`;
      if (item.reason)      line += `, razlog: ${item.reason}`;
      return line;
    }).join("\n");

    const today = new Date().toLocaleDateString("sr-Latn");

    // Zamijeni placeholder-e u šablonu
    const body = template.bodyTemplate
      .replace(/{{invoiceNumber}}/g, rec.invoiceNumber || "—")
      .replace(/{{items}}/g, itemsList)
      .replace(/{{date}}/g, today)
      .replace(/{{distributor}}/g, rec.distributorName);

    const subject = encodeURIComponent(
      template.subject
        .replace(/{{invoiceNumber}}/g, rec.invoiceNumber || "—")
        .replace(/{{date}}/g, today)
    );
    const bodyEncoded = encodeURIComponent(body);

    window.location.href = `mailto:${template.toEmail}?subject=${subject}&body=${bodyEncoded}`;
  };

  // ── Format ────────────────────────────────────────────────────────────────

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("sr-Latn") + " u " +
      d.toLocaleTimeString("sr-Latn", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 space-y-5">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reklamacije</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} ukupno</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }}>
          {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showForm ? "Zatvori" : "Nova reklamacija"}
        </Button>
      </div>

      {/* ── Forma ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-5">
          <h2 className="font-medium">Nova reklamacija</h2>

          {/* Odabir dobavljača */}
          <div className="space-y-2">
            <Label>Dobavljač *</Label>
            <div className="flex flex-wrap gap-2">
              {DISTRIBUTORS.map((d) => (
                <button
                  key={d.name}
                  onClick={() => { setDistName(d.name); setCustomDist(""); setItems([emptyItem()]); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    distName === d.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {distName === "Drugi..." && (
              <Input
                value={customDist}
                onChange={(e) => setCustomDist(e.target.value)}
                placeholder="Upiši naziv dobavljača"
                className="max-w-xs"
                autoFocus
              />
            )}
          </div>

          {/* Polja koja se prikazuju tek kad je dobavljač odabran */}
          {distName && (
            <>
              {/* Broj fakture */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="invoiceNumber">Broj fakture *</Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="npr. 2024/12345"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="recNote">Napomena (opciono)</Label>
                  <Input
                    id="recNote"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Opciono"
                  />
                </div>
              </div>

              {/* Artikli */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Artikli *</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Dodaj artikal
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Artikal {idx + 1}
                      </span>
                      {items.length > 1 && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Naziv artikla *</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateItem(idx, "productName", e.target.value)}
                          placeholder="npr. Brufen 400mg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Količina *</Label>
                        <Input
                          type="number" min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                        />
                      </div>

                      {/* Sopharma/CM polja */}
                      {isSopharmaType && (
                        <>
                          <div className="space-y-1">
                            <Label>Broj serije</Label>
                            <Input
                              value={item.batchNumber || ""}
                              onChange={(e) => updateItem(idx, "batchNumber", e.target.value)}
                              placeholder="npr. BN123456"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Rok trajanja</Label>
                            <Input
                              value={item.expiryDate || ""}
                              onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                              placeholder="npr. 12/2026"
                            />
                          </div>
                        </>
                      )}

                      {/* Razlog — za ostale dobavljače po artiklu */}
                      {!isSopharmaType && (
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Razlog reklamacije *</Label>
                          <Input
                            value={item.reason || ""}
                            onChange={(e) => updateItem(idx, "reason", e.target.value)}
                            placeholder="npr. Oštećena ambalaža"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Opšti razlog za Sopharma/CM */}
                {isSopharmaType && (
                  <div className="space-y-1">
                    <Label>Opšti razlog reklamacije (opciono)</Label>
                    <Input
                      value={generalReason}
                      onChange={(e) => setGeneralReason(e.target.value)}
                      placeholder="Zajednički razlog za sve artikle..."
                    />
                  </div>
                )}
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                  Odustani
                </Button>
                <Button size="sm" onClick={handleFormSubmit}>Sačuvaj</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filteri */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pretraži po dobavljaču, artiklu ili broju fakture..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "sve", label: "Sve" },
            ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setFilterStatus(value as ReclamationStatus | "sve"); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista reklamacija */}
      {paginated.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          Nema reklamacija.
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((rec) => {
            const isExpanded = expanded[rec.id];
            const template   = templates.find((t) => t.distributorName === rec.distributorName);
            const done       = rec.status === "Riješena" || rec.status === "Odbijena";

            return (
              <div
                key={rec.id}
                className={`rounded-xl border bg-card overflow-hidden transition-all ${done ? "opacity-60" : ""}`}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{rec.distributorName}</span>
                      {rec.invoiceNumber && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Faktura: {rec.invoiceNumber}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status]}`}>
                        {STATUS_LABELS[rec.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> {rec.createdBy.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rec.createdAt).toLocaleDateString("sr-Latn")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {rec.items.length} {rec.items.length === 1 ? "artikal" : "artikala"}
                      </span>
                    </div>
                  </div>

                  {/* Akcije */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Mail dugme */}
                    {template && (
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => handleSendMail(rec)}
                        title="Pošalji mail dobavljaču"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Istorija */}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setHistoryRec(rec)}
                      title="Istorija izmjena"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    {/* Expand */}
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setExpanded((p) => ({ ...p, [rec.id]: !p[rec.id] }))}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* Expanded — artikli i status */}
                {isExpanded && (
                  <div className="border-t">
                    {/* Lista artikala */}
                    <div className="divide-y">
                      {rec.items.map((item, i) => (
                        <div key={item.id} className="px-4 py-2.5 bg-muted/10">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {i + 1}. {item.productName}
                                <span className="text-muted-foreground font-normal ml-2">× {item.qty}</span>
                              </p>
                              <div className="flex flex-wrap gap-3 mt-0.5">
                                {item.batchNumber && (
                                  <span className="text-xs text-muted-foreground">Serija: {item.batchNumber}</span>
                                )}
                                {item.expiryDate && (
                                  <span className="text-xs text-muted-foreground">Rok: {item.expiryDate}</span>
                                )}
                                {item.reason && (
                                  <span className="text-xs text-muted-foreground">Razlog: {item.reason}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Napomena */}
                    {rec.note && (
                      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                        Napomena: {rec.note}
                      </div>
                    )}

                    {/* Promjena statusa */}
                    <div className="px-4 py-3 border-t flex items-center gap-3 bg-muted/5">
                      <span className="text-xs text-muted-foreground">Promijeni status:</span>
                      <select
                        value={rec.status}
                        onChange={(e) => {
                          setPendingAction({ type: "status", id: rec.id, status: e.target.value as ReclamationStatus });
                          setPinOpen(true);
                        }}
                        className="text-xs h-8 rounded border border-input bg-background px-2"
                      >
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
        description="Upiši PIN da potvrdiš akciju."
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinOpen(false); setPendingAction(null); }}
      />

      {/* Istorija modal */}
      {historyRec && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setHistoryRec(null); }}
        >
          <div className="bg-background border rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h2 className="font-semibold">{historyRec.distributorName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {historyRec.invoiceNumber ? `Faktura: ${historyRec.invoiceNumber}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setHistoryRec(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {historyRec.history.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">Nema istorije.</div>
              ) : (
                <div className="space-y-1">
                  {historyRec.history.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        {i < historyRec.history.length - 1 && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
                      </div>
                      <div className="pb-4 min-w-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                          {STATUS_LABELS[entry.status]}
                        </span>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-medium">{entry.changedBy.name}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                        </div>
                        {entry.note && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{entry.note}&rdquo;</p>}
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
