"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { NotificationPriority, NotificationStatus } from "@/lib/generated/prisma";
import {
  createNotification,
  updateNotificationStatus,
  deleteNotification,
} from "@/lib/actions/notification.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Trash2, BellOff, Check, Clock, User, Filter } from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string };

type Notification = {
  id: string;
  title: string;
  description: string | null;
  remindAt: Date;
  priority: NotificationPriority;
  status: NotificationStatus;
  createdAt: Date;
  createdBy: Worker;
  updatedBy: Worker | null;
};

type Props = { notifications: Notification[] };

// ─── Konstante ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  Normalno: "bg-blue-100 text-blue-800 border-blue-200",
  Bitno:    "bg-yellow-100 text-yellow-800 border-yellow-200",
  Hitno:    "bg-red-100 text-red-800 border-red-200",
};

const PRIORITY_BORDER: Record<NotificationPriority, string> = {
  Normalno: "border-l-blue-400",
  Bitno:    "border-l-yellow-400",
  Hitno:    "border-l-red-500",
};

const emptyForm = {
  title: "", description: "", remindDate: "",
  remindHour: "08", remindMinute: "30",
  priority: "Normalno" as NotificationPriority,
};

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function NotificationsClient({ notifications: initialData }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(initialData);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState(emptyForm);
  const [formError, setFormError]         = useState("");
  const [filterStatus, setFilterStatus]   = useState<"sve" | NotificationStatus>("NijeZavrseno");

  const [pinOpen, setPinOpen]             = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: "create" }
    | { type: "status"; id: string; status: NotificationStatus }
    | { type: "delete"; id: string }
    | null
  >(null);

  // Osvježavamo now svaki put kad se render-uje
  const now = new Date();

  // ── Filtriranje i sortiranje ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    return [...notifications]
      .filter((n) => filterStatus === "sve" || n.status === filterStatus)
      .sort((a, b) => {
        // Završene idu na kraj
        if (a.status !== b.status) return a.status === "NijeZavrseno" ? -1 : 1;

        // Unutar aktivnih: istekle gore (po datumu uzlazno), buduće ispod
        const aTime   = new Date(a.remindAt).getTime();
        const bTime   = new Date(b.remindAt).getTime();
        const nowTime = now.getTime();
        const aOverdue = aTime <= nowTime;
        const bOverdue = bTime <= nowTime;

        if (aOverdue && !bOverdue) return -1;  // a istekla, b nije → a gore
        if (!aOverdue && bOverdue) return 1;   // b istekla, a nije → b gore
        return aTime - bTime;                  // iste kategorije → po datumu
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, filterStatus]);

  const activeCount = notifications.filter(
    (n) => n.status === "NijeZavrseno" && new Date(n.remindAt) <= now
  ).length;

  // ── Forma ─────────────────────────────────────────────────────────────────

  const handleFormSubmit = () => {
    if (!form.title.trim()) { setFormError("Naslov je obavezan."); return; }
    if (!form.remindDate)   { setFormError("Datum je obavezan."); return; }
    const h = parseInt(form.remindHour);
    const m = parseInt(form.remindMinute);
    if (isNaN(h) || h < 0 || h > 23) { setFormError("Sati moraju biti između 0 i 23."); return; }
    if (isNaN(m) || m < 0 || m > 59) { setFormError("Minute moraju biti između 0 i 59."); return; }
    setFormError("");
    setPendingAction({ type: "create" });
    setPinOpen(true);
  };

  const handleStatusToggle = (notif: Notification) => {
    const newStatus = notif.status === "NijeZavrseno"
      ? NotificationStatus.Zavrseno
      : NotificationStatus.NijeZavrseno;
    setPendingAction({ type: "status", id: notif.id, status: newStatus });
    setPinOpen(true);
  };

  const handleDelete = (id: string) => {
    setPendingAction({ type: "delete", id });
    setPinOpen(true);
  };

  // ── PIN potvrđen ──────────────────────────────────────────────────────────

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === "create") {
      const h  = form.remindHour.padStart(2, "0");
      const m  = form.remindMinute.padStart(2, "0");
      const fd = new FormData();
      fd.set("title",       form.title.trim());
      fd.set("description", form.description.trim());
      fd.set("remindDate",  form.remindDate);
      fd.set("remindTime",  `${h}:${m}`);
      fd.set("priority",    form.priority);
      fd.set("workerId",    worker.id);

      const result = await createNotification(fd);
      if (result.success) {
        // Dodaj odmah u lokalni state — bez čekanja na reload
        const remindAt = new Date(`${form.remindDate}T${h}:${m}:00+02:00`);
        const newNotif: Notification = {
          id:          Date.now().toString(),
          title:       form.title.trim(),
          description: form.description.trim() || null,
          remindAt,
          priority:    form.priority,
          status:      NotificationStatus.NijeZavrseno,
          createdAt:   new Date(),
          createdBy:   { id: worker.id, name: worker.name },
          updatedBy:   null,
        };
        setNotifications((prev) => [newNotif, ...prev]);
        setForm(emptyForm);
        setShowForm(false);
        router.refresh(); // osvježi badge u headeru
      } else {
        setFormError(result.message);
      }
    }

    if (pendingAction.type === "status") {
      const result = await updateNotificationStatus(pendingAction.id, pendingAction.status, worker.id);
      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === pendingAction.id
              ? { ...n, status: pendingAction.status, updatedBy: { id: worker.id, name: worker.name } }
              : n
          )
        );
        router.refresh();
      }
    }

    if (pendingAction.type === "delete") {
      const result = await deleteNotification(pendingAction.id);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== pendingAction.id));
        router.refresh();
      }
    }

    setPendingAction(null);
  };

  // ── Formatiranje ──────────────────────────────────────────────────────────

  const formatRemindAt = (date: Date) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString("sr-Latn", { day: "numeric", month: "long", year: "numeric" });
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${dateStr} u ${hh}:${mm}`;
  };

  const isOverdue  = (n: Notification) => n.status === "NijeZavrseno" && new Date(n.remindAt) <= now;
  const isUpcoming = (n: Notification) => n.status === "NijeZavrseno" && new Date(n.remindAt) > now;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 space-y-5">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifikacije</h1>
          {activeCount > 0 && (
            <p className="text-sm text-red-600 font-medium">
              {activeCount} {activeCount === 1 ? "aktivan podsjetnik čeka" : "aktivnih podsjetnika čeka"}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
          {showForm ? "Zatvori" : "Novi podsjetnik"}
        </Button>
      </div>

      {/* Forma */}
      {showForm && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-medium">Novi podsjetnik</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="title">Naslov *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="npr. Popis lijekova"
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("notif-desc")?.focus(); }}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notif-desc">Opis (opciono)</Label>
              <Input
                id="notif-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Dodatne informacije..."
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("notif-date")?.focus(); }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notif-date">Datum *</Label>
              <Input
                id="notif-date"
                type="date"
                value={form.remindDate}
                onChange={(e) => setForm((f) => ({ ...f, remindDate: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("notif-hour")?.focus(); }}
              />
            </div>
            {/* Sati i minute — 24h, ručni unos */}
            <div className="space-y-1">
              <Label>Vrijeme (24h, default 08:30)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="notif-hour"
                  type="number"
                  min={0} max={23}
                  value={form.remindHour}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setForm((f) => ({ ...f, remindHour: v }));
                  }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    setForm((f) => ({ ...f, remindHour: isNaN(v) ? "08" : String(Math.min(23, Math.max(0, v))).padStart(2, "0") }));
                  }}
                  placeholder="08"
                  className="w-16 text-center"
                  onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("notif-minute")?.focus(); }}
                />
                <span className="text-lg font-bold text-muted-foreground">:</span>
                <Input
                  id="notif-minute"
                  type="number"
                  min={0} max={59}
                  value={form.remindMinute}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setForm((f) => ({ ...f, remindMinute: v }));
                  }}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    setForm((f) => ({ ...f, remindMinute: isNaN(v) ? "30" : String(Math.min(59, Math.max(0, v))).padStart(2, "0") }));
                  }}
                  placeholder="30"
                  className="w-16 text-center"
                  onKeyDown={(e) => { if (e.key === "Enter") handleFormSubmit(); }}
                />
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Prioritet</Label>
              <div className="flex gap-2">
                {(["Normalno", "Bitno", "Hitno"] as NotificationPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-all ${
                      form.priority === p
                        ? PRIORITY_COLORS[p] + " border"
                        : "border-input text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}>
              Odustani
            </Button>
            <Button size="sm" onClick={handleFormSubmit}>Sačuvaj</Button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {([
          { value: "NijeZavrseno", label: "Aktivni" },
          { value: "Zavrseno",     label: "Završeni" },
          { value: "sve",          label: "Svi" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterStatus === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {label}
            {value === "NijeZavrseno" && activeCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <BellOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nema podsjetnika.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const overdue  = isOverdue(notif);
            const upcoming = isUpcoming(notif);
            const done     = notif.status === "Zavrseno";

            return (
              <div
                key={notif.id}
                className={`rounded-xl border bg-card p-4 border-l-4 transition-all ${
                  done ? "border-l-emerald-400 opacity-60" : PRIORITY_BORDER[notif.priority]
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Krug za završavanje */}
                  <button
                    onClick={() => !upcoming && handleStatusToggle(notif)}
                    disabled={upcoming}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : upcoming
                        ? "border-muted-foreground/20 bg-muted/30 cursor-not-allowed"
                        : "border-red-400 hover:bg-red-50 cursor-pointer"
                    }`}
                    title={
                      done     ? "Označi kao aktivno" :
                      upcoming ? "Nije još moguće završiti — rok nije istekao" :
                                 "Označi kao završeno"
                    }
                  >
                    {done && <Check className="w-3 h-3" />}
                  </button>

                  {/* Sadržaj */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                          {notif.title}
                        </p>
                        {notif.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!done && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[notif.priority]}`}>
                            {notif.priority}
                          </span>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
                          onClick={() => handleDelete(notif.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className={`flex items-center gap-1 text-xs font-medium ${
                        overdue ? "text-red-600" : upcoming ? "text-blue-600" : "text-emerald-700"
                      }`}>
                        <Clock className="w-3 h-3" />
                        {overdue ? "Isteklo: " : upcoming ? "Rok: " : ""}
                        {formatRemindAt(notif.remindAt)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {notif.createdBy.name}
                      </span>
                      {notif.updatedBy && done && (
                        <span className="text-xs text-muted-foreground">
                          · završio/la {notif.updatedBy.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}
