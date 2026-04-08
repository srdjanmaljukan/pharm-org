"use client";

import { useState, useRef, useEffect } from "react";
import { verifyPin } from "@/lib/actions/worker.actions";
import { WorkerRole } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Tip koji se vraća nakon uspješne provjere ────────────────────────────────

export type VerifiedWorker = {
  id: string;
  name: string;
  role: WorkerRole;
};

// ─── Props ────────────────────────────────────────────────────────────────────

type PinModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: (worker: VerifiedWorker) => void;
  onCancel: () => void;
};

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function PinModal({
  isOpen,
  title = "Potvrdi identitet",
  description = "Upiši svoj PIN da nastaviš.",
  onSuccess,
  onCancel,
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fokusiraj input kada se modal otvori
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    setError("");

    const result = await verifyPin(pin);

    if (result.success && result.worker) {
      setPin("");
      onSuccess(result.worker);
    } else {
      setError(result.message || "Pogrešan PIN.");
      setPin("");
      inputRef.current?.focus();
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onCancel();
  };

  if (!isOpen) return null;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Modal box */}
      <div className="bg-background border rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
        {/* Zaglavlje */}
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground mb-5">{description}</p>

        {/* Prikaz unesenih cifara kao tačkice */}
        <div className="flex justify-center gap-3 mb-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border-2 transition-all ${
                i < pin.length
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/40"
              }`}
            />
          ))}
        </div>

        {/* Skriveni input (fokusiran, prima unos) */}
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setPin(val);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          className="opacity-0 absolute pointer-events-none"
          aria-label="PIN unos"
          autoComplete="off"
        />

        {/* Numerička tastatura */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (pin.length < 6) {
                  setPin((p) => p + num);
                  setError("");
                }
              }}
              className="h-14 rounded-lg text-xl font-medium bg-secondary hover:bg-secondary/70 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          {/* Prazno, 0, Brisanje */}
          <div />
          <button
            onClick={() => {
              if (pin.length < 6) {
                setPin((p) => p + "0");
                setError("");
              }
            }}
            className="h-14 rounded-lg text-xl font-medium bg-secondary hover:bg-secondary/70 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="h-14 rounded-lg text-xl font-medium bg-secondary hover:bg-secondary/70 active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        {/* Greška */}
        {error && (
          <p className="text-sm text-destructive text-center mb-3">{error}</p>
        )}

        {/* Akcije */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Odustani
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || pin.length < 4}
          >
            {loading ? "Provjera..." : "Potvrdi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
