"use server";

import { prisma } from "@/db/prisma";
import { SlipperType } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati sve varijante papuča ────────────────────────────────────────────

export async function getAllSlippers(type?: SlipperType) {
  return await prisma.slipperVariant.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: "asc" }, { size: "asc" }, { color: "asc" }],
    include: {
      updatedBy: { select: { id: true, name: true } },
      salesLog: {
        orderBy: { soldAt: "desc" },
        take: 5,
        include: { soldBy: { select: { id: true, name: true } } },
      },
    },
  });
}

// ─── Dodaj novu varijanti (admin) ─────────────────────────────────────────────

export async function createSlipperVariant(formData: FormData) {
  try {
    const type     = formData.get("type") as SlipperType;
    const size     = Number(formData.get("size"));
    const color    = (formData.get("color") as string).trim();
    const qty      = Number(formData.get("qty"));
    const workerId = formData.get("workerId") as string;

    if (!type || !size || !color || qty < 0 || !workerId) {
      return { success: false, message: "Nedostaju obavezna polja." };
    }

    await prisma.slipperVariant.create({
      data: { type, size, color, qty, updatedById: workerId },
    });

    revalidatePath("/papuce");
    return { success: true, message: `${type} papuče br. ${size} (${color}) dodane.` };
  } catch {
    return { success: false, message: "Ta kombinacija već postoji." };
  }
}

// ─── Ažuriraj zalihu (admin — može i dodati i smanjiti) ───────────────────────

export async function updateSlipperQty(
  variantId: string,
  newQty: number,
  workerId: string
) {
  try {
    if (newQty < 0) return { success: false, message: "Količina ne može biti negativna." };

    await prisma.slipperVariant.update({
      where: { id: variantId },
      data:  { qty: newQty, updatedById: workerId },
    });

    revalidatePath("/papuce");
    return { success: true, message: "Zaliha ažurirana." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju." };
  }
}

// ─── Prodaj par papuča (radnik) ───────────────────────────────────────────────

export async function sellSlippers(
  variantId: string,
  qtySold: number,
  workerId: string
) {
  try {
    const variant = await prisma.slipperVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) return { success: false, message: "Varijanta nije pronađena." };
    if (variant.qty < qtySold) {
      return { success: false, message: `Na stanju je samo ${variant.qty} ${variant.qty === 1 ? "par" : "para"}.` };
    }

    await prisma.$transaction([
      prisma.slipperVariant.update({
        where: { id: variantId },
        data:  { qty: variant.qty - qtySold, updatedById: workerId },
      }),
      prisma.slipperSale.create({
        data: { variantId, qtySold, soldById: workerId },
      }),
    ]);

    revalidatePath("/papuce");
    return { success: true, message: `Prodano ${qtySold} ${qtySold === 1 ? "par" : "para"}.`, newQty: variant.qty - qtySold };
  } catch {
    return { success: false, message: "Greška pri prodaji." };
  }
}

// ─── Obriši varijant (admin) ──────────────────────────────────────────────────

export async function deleteSlipperVariant(variantId: string) {
  try {
    await prisma.slipperVariant.delete({ where: { id: variantId } });
    revalidatePath("/papuce");
    return { success: true, message: "Varijanta obrisana." };
  } catch {
    return { success: false, message: "Greška pri brisanju." };
  }
}
