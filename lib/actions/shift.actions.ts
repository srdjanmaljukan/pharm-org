"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati dodjelu slova ────────────────────────────────────────────────────

export async function getCycleLetters() {
  return await prisma.workerCycleLetter.findMany({
    include: { worker: { select: { id: true, name: true } } },
    orderBy: { letter: "asc" },
  });
}

// ─── Sačuvaj dodjelu slova (admin) ───────────────────────────────────────────

export async function saveCycleLetters(
  assignments: { workerId: string; letter: string }[]
) {
  try {
    // Obrišemo sve i upišemo iznova
    await prisma.workerCycleLetter.deleteMany();
    if (assignments.length > 0) {
      await prisma.workerCycleLetter.createMany({
        data: assignments.map(({ workerId, letter }) => ({ workerId, letter })),
      });
    }
    revalidatePath("/raspored");
    return { success: true, message: "Dodjela slova sačuvana." };
  } catch {
    return { success: false, message: "Greška pri čuvanju." };
  }
}

// ─── Dohvati početak ciklusa ──────────────────────────────────────────────────

export async function getCycleStart() {
  return await prisma.cycleStart.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

// ─── Postavi početak ciklusa (admin) ─────────────────────────────────────────

export async function setCycleStart(startDate: string, workerId: string) {
  try {
    // Samo jedan aktivni ciklus
    await prisma.cycleStart.deleteMany();
    await prisma.cycleStart.create({
      data: {
        startDate: new Date(startDate),
        createdById: workerId,
      },
    });
    revalidatePath("/raspored");
    return { success: true, message: "Početak ciklusa postavljen." };
  } catch {
    return { success: false, message: "Greška pri postavljanju." };
  }
}

// ─── Dohvati aktivne radnike ──────────────────────────────────────────────────

export async function getActiveWorkers() {
  return await prisma.worker.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
