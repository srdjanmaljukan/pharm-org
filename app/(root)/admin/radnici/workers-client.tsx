"use client";

import { useState } from "react";
import { WorkerRole } from "@/lib/generated/prisma";
import {
  createWorker,
  updateWorker,
  deactivateWorker,
  activateWorker,
} from "@/lib/actions/worker.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Pencil, UserX, UserCheck } from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = {
  id: string;
  name: string;
  role: WorkerRole;
  isActive: boolean;
  createdAt: Date;
};

type Props = {
  workers: Worker[];
  currentUserId: string;
  adminWorkerId: string;
};

type FormState = {
  name: string;
  pin: string;
  confirmPin: string;
  role: WorkerRole;
};

const emptyForm: FormState = {
  name: "",
  pin: "",
  confirmPin: "",
  role: WorkerRole.RADNIK,
};

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function WorkersClient({
  workers: initialWorkers,
  currentUserId,
  adminWorkerId,
}: Props) {
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (worker: Worker) => {
    setEditingId(worker.id);
    setForm({
      name: worker.name,
      pin: "",
      confirmPin: "",
      role: worker.role,
    });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Ime mora imati najmanje 2 karaktera.");
      return;
    }

    // PIN validacija (obavezan za novi, opcionalan za izmjenu)
    if (!editingId || form.pin) {
      if (!/^\d{4,6}$/.test(form.pin)) {
        setError("PIN mora biti broj od 4 do 6 cifara.");
        return;
      }
      if (form.pin !== form.confirmPin) {
        setError("PIN-ovi se ne podudaraju.");
        return;
      }
    }

    setLoading(true);

    const fd = new FormData();
    fd.set("name", form.name.trim());
    fd.set("role", form.role);
    if (form.pin) fd.set("pin", form.pin);
    if (!editingId) fd.set("userId", currentUserId);

    const result = editingId
      ? await updateWorker(editingId, fd)
      : await createWorker(fd);

    setLoading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    // Osvježi listu bez reload-a stranice
    const updated = await fetch("/api/workers").then((r) =>
      r.ok ? r.json() : null
    );
    if (updated) setWorkers(updated);

    showSuccess(result.message);
    resetForm();
  };

  const handleToggleActive = async (worker: Worker) => {
    const fn = worker.isActive ? deactivateWorker : activateWorker;
    const result = await fn(worker.id);
    if (result.success) {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id ? { ...w, isActive: !w.isActive } : w
        )
      );
      showSuccess(result.message);
    }
  };

  const activeWorkers = workers.filter((w) => w.isActive);
  const inactiveWorkers = workers.filter((w) => !w.isActive);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Upravljanje radnicima</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novi radnik
          </Button>
        )}
      </div>

      {/* Poruka uspjeha */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}

      {/* Forma za kreiranje / izmjenu */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="npr. Marija Nikolić"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="role">Uloga</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      role: e.target.value as WorkerRole,
                    }))
                  }
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={WorkerRole.RADNIK}>Radnik</option>
                  <option value={WorkerRole.ADMIN}>Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pin">
                  PIN {editingId && "(ostavi prazno da zadržiš stari)"}
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pin: e.target.value.replace(/\D/g, ""),
                    }))
                  }
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
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      confirmPin: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Ponovi PIN"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Odustani
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading
                  ? "Čuvanje..."
                  : editingId
                  ? "Sačuvaj izmjene"
                  : "Kreiraj radnika"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aktivni radnici */}
      <Card>
        <CardHeader>
          <CardTitle>Aktivni radnici ({activeWorkers.length})</CardTitle>
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        worker.role === WorkerRole.ADMIN
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {worker.role === WorkerRole.ADMIN ? "Admin" : "Radnik"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(worker.createdAt).toLocaleDateString("sr-Latn")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(worker)}
                        title="Izmijeni"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(worker)}
                        title="Deaktiviraj"
                        className="text-destructive hover:text-destructive"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {activeWorkers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nema aktivnih radnika.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Neaktivni radnici */}
      {inactiveWorkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-base">
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
                    <TableCell className="font-medium line-through">
                      {worker.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {worker.role === WorkerRole.ADMIN ? "Admin" : "Radnik"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(worker)}
                        title="Reaktiviraj"
                      >
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
  );
}
