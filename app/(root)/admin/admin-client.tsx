"use client";

import { useState } from "react";
import { WorkerRole } from "@/lib/generated/prisma";
import {
  createWorker, updateWorker,
  deactivateWorker, activateWorker,
} from "@/lib/actions/worker.actions";
import {
  createDistributor, deleteDistributor,
} from "@/lib/actions/distributor.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { UserPlus, Pencil, UserX, UserCheck, Lock, ShieldCheck, Plus, X, Truck } from "lucide-react";

type Worker = {
  id: string;
  name: string;
  role: WorkerRole;
  isActive: boolean;
  createdAt: Date;
};

type Distributor = {
  id: string;
  name: string;
};

type Props = {
  workers: Worker[];
  distributors: Distributor[];
  currentUserId: string;
};

type FormState = {
  name: string;
  pin: string;
  confirmPin: string;
  role: WorkerRole;
};

const emptyForm: FormState = { name: "", pin: "", confirmPin: "", role: WorkerRole.RADNIK };

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function AdminClient({ workers: initialWorkers, distributors: initialDistributors, currentUserId }: Props) {
  const [workers, setWorkers]           = useState<Worker[]>(initialWorkers);
  const [distributors, setDistributors] = useState<Distributor[]>(initialDistributors);
  const [newDistributor, setNewDistributor] = useState("");
  const [distError, setDistError]       = useState("");
  const [distLoading, setDistLoading]   = useState(false);

  // Admin verifikacija — ko je ušao u panel
  const [adminWorker, setAdminWorker] = useState<VerifiedWorker | null>(null);
  const [adminPinOpen, setAdminPinOpen] = useState(false);

  // Forma za radnike
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // PIN za akciju (kreiranje/izmjena/deaktivacija)
  const [actionPinOpen, setActionPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "create" | "update"; formData: FormData }
    | { type: "toggle"; workerId: string; activate: boolean }
    | null
  >(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setEditingId(null);
    setShowForm(false);
  };

  // ── Ulaz u admin panel (PIN provjera) ──────────────────────────────────────

  const handleAdminPinSuccess = (worker: VerifiedWorker) => {
    if (worker.role !== WorkerRole.ADMIN) {
      setAdminPinOpen(false);
      setFormError("Samo admin radnik može upravljati panelom.");
      return;
    }
    setAdminWorker(worker);
    setAdminPinOpen(false);

    // Ako je PIN tražen zbog dodavanja dobavljača, odmah nastavi
    if (newDistributor.trim()) {
      confirmAddDistributor(worker);
    }
  };

  // ── Forma ──────────────────────────────────────────────────────────────────

  const handleEdit = (worker: Worker) => {
    if (!adminWorker) { setAdminPinOpen(true); return; }
    setEditingId(worker.id);
    setForm({ name: worker.name, pin: "", confirmPin: "", role: worker.role });
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNewWorker = () => {
    if (!adminWorker) { setAdminPinOpen(true); return; }
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    if (!adminWorker) { setAdminPinOpen(true); return; }

    if (!form.name.trim() || form.name.trim().length < 2) {
      setFormError("Ime mora imati najmanje 2 karaktera."); return;
    }
    if (!editingId || form.pin) {
      if (!/^\d{4,6}$/.test(form.pin)) {
        setFormError("PIN mora biti broj od 4 do 6 cifara."); return;
      }
      if (form.pin !== form.confirmPin) {
        setFormError("PIN-ovi se ne podudaraju."); return;
      }
    }

    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("role", form.role);
    if (form.pin) fd.set("pin", form.pin);
    if (!editingId) fd.set("userId", currentUserId);

    setPendingAction({ type: editingId ? "update" : "create", formData: fd });
    setActionPinOpen(true);
  };

  const handleToggleActive = (worker: Worker) => {
    if (!adminWorker) { setAdminPinOpen(true); return; }
    setPendingAction({ type: "toggle", workerId: worker.id, activate: !worker.isActive });
    setActionPinOpen(true);
  };

  // ── Potvrda akcije PIN-om ──────────────────────────────────────────────────

  const handleActionPinSuccess = async (worker: VerifiedWorker) => {
    setActionPinOpen(false);
    if (!pendingAction || worker.role !== WorkerRole.ADMIN) return;

    setLoading(true);

    if (pendingAction.type === "create") {
      const result = await createWorker(pendingAction.formData);
      if (result.success) {
        showSuccess(result.message);
        resetForm();
        refreshWorkers();
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "update" && editingId) {
      const result = await updateWorker(editingId, pendingAction.formData);
      if (result.success) {
        showSuccess(result.message);
        resetForm();
        refreshWorkers();
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "toggle") {
      const fn = pendingAction.activate ? activateWorker : deactivateWorker;
      const result = await fn(pendingAction.workerId);
      if (result.success) {
        setWorkers((prev) =>
          prev.map((w) =>
            w.id === pendingAction.workerId
              ? { ...w, isActive: pendingAction.activate }
              : w
          )
        );
        showSuccess(result.message);
      }
    }

    setLoading(false);
    setPendingAction(null);
  };

  const refreshWorkers = async () => {
    const res = await fetch("/api/workers");
    if (res.ok) setWorkers(await res.json());
  };

  // ── Dobavljači ─────────────────────────────────────────────────────────────

  const handleAddDistributor = () => {
    if (!newDistributor.trim()) { setDistError("Naziv je obavezan."); return; }
    if (!adminWorker) { setAdminPinOpen(true); return; }
    confirmAddDistributor(adminWorker);
  };

  const confirmAddDistributor = async (worker: VerifiedWorker) => {
    setDistLoading(true);
    setDistError("");
    const result = await createDistributor(newDistributor.trim());
    if (result.success) {
      setDistributors((prev) =>
        [...prev, { id: Date.now().toString(), name: newDistributor.trim() }]
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewDistributor("");
      showSuccess(result.message);
    } else {
      setDistError(result.message);
    }
    setDistLoading(false);
  };

  const handleDeleteDistributor = (id: string, name: string) => {
    if (!adminWorker) { setAdminPinOpen(true); return; }
    if (!confirm(`Ukloniti dobavljača "${name}"?`)) return;
    deleteDistributorConfirmed(id);
  };

  const deleteDistributorConfirmed = async (id: string) => {
    const result = await deleteDistributor(id);
    if (result.success) {
      setDistributors((prev) => prev.filter((d) => d.id !== id));
      showSuccess(result.message);
    }
  };

  const activeWorkers   = workers.filter((w) => w.isActive);
  const inactiveWorkers = workers.filter((w) => !w.isActive);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin panel</h1>
          <p className="text-sm text-muted-foreground">Upravljanje radnicima i podešavanjima</p>
        </div>

        {/* Status admin sesije */}
        {adminWorker ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <ShieldCheck className="w-4 h-4" />
            Prijavljen kao {adminWorker.name}
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdminPinOpen(true)}>
            <Lock className="w-4 h-4 mr-1.5" />
            Admin prijava
          </Button>
        )}
      </div>

      {/* Poruke */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}
      {formError && !showForm && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
          {formError}
        </div>
      )}

      {/* ── Upravljanje radnicima ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Radnici</h2>
          <Button size="sm" onClick={handleNewWorker} disabled={loading}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Novi radnik
          </Button>
        </div>

        {/* Forma */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingId ? "Izmijeni radnika" : "Novi radnik"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Ime i prezime</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="npr. Marija Nikolić"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="role">Uloga</Label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as WorkerRole }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={WorkerRole.RADNIK}>Radnik</option>
                    <option value={WorkerRole.ADMIN}>Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pin">PIN {editingId && "(ostavi prazno da zadržiš stari)"}</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pin}
                    onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="4–6 cifara"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPin">Potvrdi PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.confirmPin}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPin: e.target.value.replace(/\D/g, "") }))}
                    placeholder="Ponovi PIN"
                  />
                </div>
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={resetForm} disabled={loading}>Odustani</Button>
                <Button size="sm" onClick={handleFormSubmit} disabled={loading}>
                  {loading ? "Čuvanje..." : editingId ? "Sačuvaj izmjene" : "Kreiraj radnika"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela aktivnih */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivni radnici ({activeWorkers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime</TableHead>
                  <TableHead>Uloga</TableHead>
                  <TableHead>Dodan</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWorkers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        worker.role === WorkerRole.ADMIN
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {worker.role === WorkerRole.ADMIN ? "Admin" : "Radnik"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(worker.createdAt).toLocaleDateString("sr-Latn")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(worker)} title="Izmijeni">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(worker)} title="Deaktiviraj" className="text-destructive hover:text-destructive">
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {activeWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nema aktivnih radnika.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Neaktivni */}
        {inactiveWorkers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">
                Neaktivni radnici ({inactiveWorkers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ime</TableHead>
                    <TableHead>Uloga</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveWorkers.map((worker) => (
                    <TableRow key={worker.id} className="opacity-60">
                      <TableCell className="font-medium line-through">{worker.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {worker.role === WorkerRole.ADMIN ? "Admin" : "Radnik"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(worker)} title="Reaktiviraj">
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Dobavljači ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Dobavljači
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj dobavljača</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newDistributor}
                onChange={(e) => { setNewDistributor(e.target.value); setDistError(""); }}
                placeholder="Naziv dobavljača"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddDistributor(); }}}
              />
              <Button onClick={handleAddDistributor} disabled={distLoading} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Dodaj
              </Button>
            </div>
            {distError && <p className="text-sm text-destructive">{distError}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista dobavljača ({distributors.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {distributors.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                Nema dobavljača. Dodaj prvog iznad.
              </div>
            ) : (
              <Table>
                <TableBody>
                  {distributors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm" variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDistributor(d.id, d.name)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PIN modal — ulaz u admin panel */}
      <PinModal
        isOpen={adminPinOpen}
        title="Admin prijava"
        description="Upiši svoj admin PIN da pristupiš panelu."
        onSuccess={handleAdminPinSuccess}
        onCancel={() => setAdminPinOpen(false)}
      />

      {/* PIN modal — potvrda akcije */}
      <PinModal
        isOpen={actionPinOpen}
        title="Potvrdi akciju"
        description="Upiši admin PIN da potvrdiš izmjenu."
        onSuccess={handleActionPinSuccess}
        onCancel={() => { setActionPinOpen(false); setPendingAction(null); }}
      />
    </div>
  );
}
