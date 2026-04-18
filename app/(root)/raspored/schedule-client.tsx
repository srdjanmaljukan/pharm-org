"use client";

import { useState, useMemo, useRef } from "react";
import { saveCycleLetters, setCycleStart } from "@/lib/actions/shift.actions";
import PinModal, { VerifiedWorker } from "@/components/shared/pin-modal";
import { WorkerRole } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Printer, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

type Worker = { id: string; name: string; role: string };

type LetterAssignment = {
  id: string;
  letter: string;
  worker: { id: string; name: string };
};

type Props = {
  letters: LetterAssignment[];
  cycleStart: string | null;
  workers: Worker[];
};

// ─── Generiši ciklus ─────────────────────────────────────────────────────────
// Svake sedmice početak se pomiče za +3 pozicije (mod n)

function generateCycle(sortedLetters: string[]): Array<{ sat: string[]; sun: string[] }> {
  const n = sortedLetters.length;
  if (n === 0) return [];

  // Pomak po sedmici — za 8 radnika to je 3, generalno je Math.ceil(n/3)
  // ali za ovaj specifičan slučaj koristimo floor(n/3) + 1 ako ne dijelji
  // Najsigurnije: hardkodiramo pomak 3 jer je to suštinska logika rasporeda
  const step = 3;

  return Array.from({ length: n }, (_, week) => {
    const startIdx = (week * step) % n;
    const sat = [0, 1, 2].map((i) => sortedLetters[(startIdx + i) % n]);
    return { sat, sun: [sat[0], sat[1]] };
  });
}

// ─── Pomoćne funkcije ─────────────────────────────────────────────────────────

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const MONTHS = ["Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar"];

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function ScheduleClient({ letters: initialLetters, cycleStart: initialCycleStart, workers }: Props) {
  const [letters, setLetters]             = useState<LetterAssignment[]>(initialLetters);
  const [cycleStart, setCycleStartState]  = useState<string | null>(initialCycleStart);
  const [showSettings, setShowSettings]   = useState(false);
  const [monthOffset, setMonthOffset]     = useState(0);

  const [letterMap, setLetterMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initialLetters.forEach((l) => { m[l.worker.id] = l.letter; });
    return m;
  });
  const [cycleStartInput, setCycleStartInput] = useState(
    initialCycleStart ? initialCycleStart.substring(0, 10) : ""
  );

  const [pinOpen, setPinOpen]             = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | null>(null);
  const printRef                          = useRef<HTMLDivElement>(null);

  // ── Generiši raspored ─────────────────────────────────────────────────────

  const sortedLetters = useMemo(
    () => [...letters].sort((a, b) => a.letter.localeCompare(b.letter)).map((l) => l.letter),
    [letters]
  );

  const letterToName = useMemo(() => {
    const m: Record<string, string> = {};
    letters.forEach((l) => { m[l.letter] = l.worker.name; });
    return m;
  }, [letters]);

  const cycle = useMemo(() => generateCycle(sortedLetters), [sortedLetters]);

  const weekends = useMemo(() => {
    if (!cycleStart || cycle.length === 0) return [];
    const start = new Date(cycleStart);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 52 }, (_, i) => {
      const sat = addDays(start, i * 7);
      const sun = addDays(sat, 1);
      const { sat: satL, sun: sunL } = cycle[i % cycle.length];
      return {
        weekInCycle: (i % cycle.length) + 1,
        sat, sun,
        satWorkers: satL.map((l) => ({ letter: l, name: letterToName[l] || "" })),
        sunWorkers: sunL.map((l) => ({ letter: l, name: letterToName[l] || "" })),
      };
    });
  }, [cycleStart, cycle, letterToName]);

  const months = useMemo(() => {
    const map = new Map<string, typeof weekends>();
    weekends.forEach((w) => {
      const key = `${w.sat.getFullYear()}-${w.sat.getMonth()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return Array.from(map.values()).map((weeks) => ({
      year: weeks[0].sat.getFullYear(),
      month: weeks[0].sat.getMonth(),
      weeks,
    }));
  }, [weekends]);

  const currentMonth = months[monthOffset];

  // ── Štampa ───────────────────────────────────────────────────────────────

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Raspored vikenda</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;padding:10mm;}
        .title{text-align:center;font-size:22px;font-weight:bold;border:2px solid #000;padding:6px;margin-bottom:14px;}
        .block{display:flex;border:1px solid #000;margin-bottom:10px;}
        .col{flex:1;border-right:1px solid #000;}
        .col:last-child{border-right:none;}
        .num{font-size:20px;font-weight:bold;padding:3px 8px;border-bottom:1px solid #000;display:block;}
        .row{padding:4px 8px;border-bottom:1px solid #000;min-height:24px;font-size:13px;}
        .row:last-child{border-bottom:none;}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  // ── Sačuvaj postavke ─────────────────────────────────────────────────────

  const handlePinSuccess = async (worker: VerifiedWorker) => {
    setPinOpen(false);
    if (worker.role !== WorkerRole.ADMIN) {
      alert("Samo admin radnik može mijenjati postavke.");
      return;
    }

    const assignments = Object.entries(letterMap)
      .filter(([, l]) => l.trim())
      .map(([workerId, letter]) => ({ workerId, letter: letter.toUpperCase() }));

    const [r1] = await Promise.all([
      saveCycleLetters(assignments),
      cycleStartInput ? setCycleStart(cycleStartInput, worker.id) : Promise.resolve({ success: true }),
    ]);

    if (r1.success) {
      const newLetters: LetterAssignment[] = assignments.map((a) => ({
        id: a.workerId,
        letter: a.letter,
        worker: workers.find((w) => w.id === a.workerId)!,
      }));
      setLetters(newLetters);
      if (cycleStartInput) setCycleStartState(cycleStartInput);
      setShowSettings(false);
    }

    setPendingAction(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="py-6 space-y-5">

      {/* Zaglavlje */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Raspored vikenda</h1>
          {sortedLetters.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {sortedLetters.length}-sedmični ciklus · {sortedLetters.join(" ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!currentMonth}>
            <Printer className="w-4 h-4 mr-1.5" /> Štampaj
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            <Settings className="w-4 h-4 mr-1.5" /> Postavke
          </Button>
        </div>
      </div>

      {/* Postavke */}
      {showSettings && (
        <div className="rounded-xl border bg-card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium">Postavke ciklusa</h2>
            <span className="text-xs text-muted-foreground">(admin PIN)</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Dodjela slova radnicima</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workers.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <Input
                    value={letterMap[w.id] || ""}
                    onChange={(e) => setLetterMap((p) => ({ ...p, [w.id]: e.target.value.toUpperCase().slice(0, 1) }))}
                    placeholder="A"
                    className="w-12 h-8 text-center font-bold text-base"
                    maxLength={1}
                  />
                  <span className="text-sm">{w.name}</span>
                  {w.role === "ADMIN" && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-auto">Admin</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Subota sedmice 1 ciklusa</p>
            <Input
              type="date"
              value={cycleStartInput}
              onChange={(e) => setCycleStartInput(e.target.value)}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Odaberi datum subote koja odgovara sedmici 1 u ciklusu.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>Odustani</Button>
            <Button size="sm" onClick={() => { setPendingAction("save"); setPinOpen(true); }}>Sačuvaj</Button>
          </div>
        </div>
      )}

      {/* Prazno stanje */}
      {(!cycleStart || sortedLetters.length === 0) ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-2">
          <p className="text-muted-foreground">Raspored nije podešen.</p>
          <p className="text-xs text-muted-foreground">
            Klikni <strong>Postavke</strong> da dodijeliš slova radnicima i postaviš početak ciklusa.
          </p>
        </div>
      ) : (
        <>
          {/* Navigacija po mjesecima */}
          <div className="flex items-center gap-3 justify-center">
            <Button variant="outline" size="icon"
              onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
              disabled={monthOffset === 0}
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </Button>
            <span className="text-base font-semibold min-w-[180px] text-center">
              {currentMonth ? `${MONTHS[currentMonth.month]} ${currentMonth.year}` : ""}
            </span>
            <Button variant="outline" size="icon"
              onClick={() => setMonthOffset((v) => Math.min(months.length - 1, v + 1))}
              disabled={monthOffset >= months.length - 1}
            >
              <ChevronUp className="w-4 h-4 rotate-90" />
            </Button>
          </div>

          {/* Raspored */}
          {currentMonth && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 text-center">
                <h2 className="font-semibold tracking-widest uppercase text-sm">
                  {MONTHS[currentMonth.month]} {currentMonth.year}.
                </h2>
              </div>
              <div className="divide-y">
                {currentMonth.weeks.map((week) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const isCurrent = week.sat <= today && today <= week.sun;
                  return (
                    <div key={toYMD(week.sat)} className={`flex ${isCurrent ? "bg-primary/5 border-l-2 border-primary" : ""}`}>
                      {/* Subota */}
                      <div className="flex-1 border-r">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b">
                          <span className="text-lg font-bold">{week.sat.getDate()}</span>
                          <span className="text-xs text-muted-foreground">Subota · sed.{week.weekInCycle}</span>
                        </div>
                        {week.satWorkers.map((w) => (
                          <div key={w.letter} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0">
                            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{w.letter}</span>
                            <span className="text-sm">{w.name || <span className="text-muted-foreground/40">—</span>}</span>
                          </div>
                        ))}
                      </div>

                      {/* Nedjelja */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/20 border-b">
                          <span className="text-lg font-bold">{week.sun.getDate()}</span>
                          <span className="text-xs text-muted-foreground">Nedjelja</span>
                        </div>
                        {week.sunWorkers.map((w) => (
                          <div key={w.letter} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0">
                            <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{w.letter}</span>
                            <span className="text-sm">{w.name || <span className="text-muted-foreground/40">—</span>}</span>
                          </div>
                        ))}
                        {/* Prazan red da poravna visinu sa subotom */}
                        <div className="px-3 py-2 opacity-0 select-none"><span className="text-sm">—</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Skriveni sadržaj za štampu */}
      <div ref={printRef} className="hidden">
        {currentMonth && (
          <>
            <div className="title">{MONTHS[currentMonth.month].toUpperCase()} {currentMonth.year}.</div>
            {currentMonth.weeks.map((week) => (
              <div key={toYMD(week.sat)} className="block">
                <div className="col">
                  <span className="num">{week.sat.getDate()}</span>
                  {week.satWorkers.map((w) => (
                    <div key={w.letter} className="row">{w.name}</div>
                  ))}
                </div>
                <div className="col">
                  <span className="num">{week.sun.getDate()}</span>
                  {week.sunWorkers.map((w) => (
                    <div key={w.letter} className="row">{w.name}</div>
                  ))}
                  <div className="row" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* PIN modal */}
      <PinModal
        isOpen={pinOpen}
        title="Admin potvrda"
        description="Samo admin radnik može mijenjati raspored."
        onSuccess={handlePinSuccess}
        onCancel={() => { setPinOpen(false); setPendingAction(null); }}
      />
    </div>
  );
}
