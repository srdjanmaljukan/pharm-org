"use server";

import { prisma } from "@/db/prisma";
import { WorkerRole } from "@/lib/generated/prisma";
import { hashSync, compareSync } from "bcrypt-ts-edge";
import { revalidatePath } from "next/cache";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

export type WorkerActionResult = {
  success: boolean;
  message: string;
};

// ─── Dohvati sve radnike ──────────────────────────────────────────────────────

export async function getAllWorkers() {
  return await prisma.worker.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

// ─── Kreiraj novog radnika (samo admin) ───────────────────────────────────────

export async function createWorker(
  formData: FormData
): Promise<WorkerActionResult> {
  try {
    const name = formData.get("name") as string;
    const pin = formData.get("pin") as string;
    const role = formData.get("role") as WorkerRole;
    const userId = formData.get("userId") as string;

    if (!name || name.trim().length < 2) {
      return { success: false, message: "Ime mora imati najmanje 2 karaktera." };
    }

    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return { success: false, message: "PIN mora biti broj od 4 do 6 cifara." };
    }

    // Provjeri da PIN nije već zauzet
    const existing = await prisma.worker.findFirst({
      where: { isActive: true },
      select: { id: true, pin: true },
    });

    // Moramo provjeri sve aktivne radnike jedan po jedan (pin je hešovan)
    const allWorkers = await prisma.worker.findMany({
      where: { isActive: true },
      select: { pin: true },
    });

    const pinTaken = allWorkers.some((w) => compareSync(pin, w.pin));
    if (pinTaken) {
      return { success: false, message: "Taj PIN je već zauzet. Odaberi drugi." };
    }

    const hashedPin = hashSync(pin, 10);

    await prisma.worker.create({
      data: {
        name: name.trim(),
        pin: hashedPin,
        role: role || WorkerRole.RADNIK,
        userId,
      },
    });

    revalidatePath("/admin/radnici");
    return { success: true, message: `Radnik "${name}" je uspješno kreiran.` };
  } catch {
    return { success: false, message: "Došlo je do greške. Pokušaj ponovo." };
  }
}

// ─── Ažuriraj radnika ─────────────────────────────────────────────────────────

export async function updateWorker(
  workerId: string,
  formData: FormData
): Promise<WorkerActionResult> {
  try {
    const name = formData.get("name") as string;
    const role = formData.get("role") as WorkerRole;
    const newPin = formData.get("pin") as string;

    if (!name || name.trim().length < 2) {
      return { success: false, message: "Ime mora imati najmanje 2 karaktera." };
    }

    const updateData: { name: string; role: WorkerRole; pin?: string } = {
      name: name.trim(),
      role,
    };

    // PIN je opcionalan pri izmjeni — samo ako je unesen novi
    if (newPin) {
      if (!/^\d{4,6}$/.test(newPin)) {
        return { success: false, message: "PIN mora biti broj od 4 do 6 cifara." };
      }

      const allOthers = await prisma.worker.findMany({
        where: { isActive: true, id: { not: workerId } },
        select: { pin: true },
      });

      const pinTaken = allOthers.some((w) => compareSync(newPin, w.pin));
      if (pinTaken) {
        return { success: false, message: "Taj PIN je već zauzet." };
      }

      updateData.pin = hashSync(newPin, 10);
    }

    await prisma.worker.update({
      where: { id: workerId },
      data: updateData,
    });

    revalidatePath("/admin/radnici");
    return { success: true, message: "Radnik je uspješno ažuriran." };
  } catch {
    return { success: false, message: "Došlo je do greške. Pokušaj ponovo." };
  }
}

// ─── Deaktiviraj radnika ──────────────────────────────────────────────────────

export async function deactivateWorker(
  workerId: string
): Promise<WorkerActionResult> {
  try {
    await prisma.worker.update({
      where: { id: workerId },
      data: { isActive: false },
    });

    revalidatePath("/admin/radnici");
    return { success: true, message: "Radnik je deaktiviran." };
  } catch {
    return { success: false, message: "Došlo je do greške." };
  }
}

// ─── Aktiviraj radnika ────────────────────────────────────────────────────────

export async function activateWorker(
  workerId: string
): Promise<WorkerActionResult> {
  try {
    await prisma.worker.update({
      where: { id: workerId },
      data: { isActive: true },
    });

    revalidatePath("/admin/radnici");
    return { success: true, message: "Radnik je aktiviran." };
  } catch {
    return { success: false, message: "Došlo je do greške." };
  }
}

// ─── Provjeri PIN i vrati radnika ─────────────────────────────────────────────

export async function verifyPin(pin: string): Promise<{
  success: boolean;
  worker?: { id: string; name: string; role: WorkerRole };
  message?: string;
}> {
  try {
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return { success: false, message: "Neispravan PIN." };
    }

    const activeWorkers = await prisma.worker.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, pin: true },
    });

    const matched = activeWorkers.find((w) => compareSync(pin, w.pin));

    if (!matched) {
      return { success: false, message: "Pogrešan PIN." };
    }

    return {
      success: true,
      worker: { id: matched.id, name: matched.name, role: matched.role },
    };
  } catch {
    return { success: false, message: "Došlo je do greške." };
  }
}
