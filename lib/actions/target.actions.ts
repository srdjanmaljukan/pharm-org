"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati targete za određeni mjesec/godinu ────────────────────────────────

export async function getTargetItems(month: number, year: number) {
  return await prisma.targetItem.findMany({
    where: { month, year, isActive: true },
    orderBy: { productName: "asc" },
    include: {
      entries: {
        orderBy: { enteredAt: "desc" },
        include: {
          enteredBy: { select: { id: true, name: true } },
        },
      },
    },
  });
}

// ─── Kreiraj novi target artikal (samo admin) ─────────────────────────────────

export async function createTargetItem(formData: FormData) {
  try {
    const productName = formData.get("productName") as string;
    const minQty      = Number(formData.get("minQty"));
    const month       = Number(formData.get("month"));
    const year        = Number(formData.get("year"));

    if (!productName || minQty < 1 || !month || !year) {
      return { success: false, message: "Nedostaju obavezna polja." };
    }

    await prisma.targetItem.create({
      data: { productName, minQty, month, year },
    });

    revalidatePath("/targeti");
    return { success: true, message: "Target artikal kreiran." };
  } catch {
    return { success: false, message: "Greška pri kreiranju." };
  }
}

// ─── Obriši / deaktiviraj target artikal (samo admin) ────────────────────────

export async function deleteTargetItem(id: string) {
  try {
    await prisma.targetItem.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/targeti");
    return { success: true, message: "Artikal uklonjen." };
  } catch {
    return { success: false, message: "Greška pri brisanju." };
  }
}

// ─── Dodaj unos prodaje ───────────────────────────────────────────────────────

export async function addSaleEntry(
  targetItemId: string,
  qtySold: number,
  workerId: string,
  note?: string
) {
  try {
    if (qtySold < 1) {
      return { success: false, message: "Količina mora biti najmanje 1." };
    }

    // Ako nema workerId, uzimamo prvog aktivnog radnika kao fallback
    let finalWorkerId = workerId;
    if (!finalWorkerId) {
      const worker = await prisma.worker.findFirst({ where: { isActive: true } });
      if (!worker) return { success: false, message: "Nema aktivnih radnika." };
      finalWorkerId = worker.id;
    }

    const entry = await prisma.targetSaleEntry.create({
      data: {
        targetItemId,
        qtySold,
        note: note || null,
        enteredById: finalWorkerId,
      },
      include: {
        enteredBy: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/targeti");
    return { success: true, message: "Prodaja unesena.", entry };
  } catch {
    return { success: false, message: "Greška pri unosu prodaje." };
  }
}

// ─── Obriši unos prodaje ──────────────────────────────────────────────────────

export async function deleteSaleEntry(entryId: string) {
  try {
    await prisma.targetSaleEntry.delete({ where: { id: entryId } });
    revalidatePath("/targeti");
    return { success: true, message: "Unos obrisan." };
  } catch {
    return { success: false, message: "Greška pri brisanju." };
  }
}
