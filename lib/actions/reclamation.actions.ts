"use server";

import { prisma } from "@/db/prisma";
import { ReclamationStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati sve reklamacije ──────────────────────────────────────────────────

export async function getAllReclamations(limit = 0) {
  return await prisma.reclamation.findMany({
    orderBy: { createdAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
    include: {
      updatedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Dohvati historiju reklamacije ────────────────────────────────────────────

export async function getReclamationHistory(reclamationId: string) {
  return await prisma.reclamationHistory.findMany({
    where: { reclamationId },
    orderBy: { changedAt: "desc" },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Kreiraj reklamaciju ──────────────────────────────────────────────────────

export async function createReclamation(formData: FormData) {
  try {
    const productName = formData.get("productName") as string;
    const distributor = formData.get("distributor") as string;
    const qty         = Number(formData.get("qty"));
    const reason      = formData.get("reason") as string;
    const note        = formData.get("note") as string | null;
    const workerId    = formData.get("workerId") as string;

    if (!productName || !distributor || !reason || !workerId) {
      return { success: false, message: "Nedostaju obavezna polja.", reclamation: null };
    }

    const reclamation = await prisma.reclamation.create({
      data: {
        productName,
        distributor,
        qty,
        reason,
        note: note || null,
        updatedById: workerId,
        history: {
          create: {
            status:     ReclamationStatus.Otvorena,
            changedById: workerId,
          },
        },
      },
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/reklamacije");
    return { success: true, message: "Reklamacija kreirana.", reclamation };
  } catch {
    return { success: false, message: "Greška pri kreiranju reklamacije.", reclamation: null };
  }
}

// ─── Izmijeni status reklamacije ──────────────────────────────────────────────

export async function updateReclamationStatus(
  reclamationId: string,
  status: ReclamationStatus,
  workerId: string,
  note?: string
) {
  try {
    await prisma.$transaction([
      prisma.reclamation.update({
        where: { id: reclamationId },
        data:  { status, updatedById: workerId },
      }),
      prisma.reclamationHistory.create({
        data: {
          reclamationId,
          status,
          note: note || null,
          changedById: workerId,
        },
      }),
    ]);

    revalidatePath("/reklamacije");
    return { success: true, message: "Status ažuriran." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju statusa." };
  }
}
