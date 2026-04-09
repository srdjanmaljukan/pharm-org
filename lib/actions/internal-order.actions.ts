"use server";

import { prisma } from "@/db/prisma";
import { InternalOrderStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati sve interne narudžbine ──────────────────────────────────────────

export async function getAllInternalOrders(limit = 0) {
  return await prisma.internalOrder.findMany({
    orderBy: { createdAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
    include: {
      updatedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Dohvati historiju ────────────────────────────────────────────────────────

export async function getInternalOrderHistory(internalOrderId: string) {
  return await prisma.internalOrderHistory.findMany({
    where: { internalOrderId },
    orderBy: { changedAt: "desc" },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Kreiraj internu narudžbinu ───────────────────────────────────────────────

export async function createInternalOrder(formData: FormData) {
  try {
    const productName = formData.get("productName") as string;
    const qty         = Number(formData.get("qty"));
    const distributor = formData.get("distributor") as string | null;
    const note        = formData.get("note") as string | null;
    const workerId    = formData.get("workerId") as string;

    if (!productName || !workerId) {
      return { success: false, message: "Nedostaju obavezna polja.", order: null };
    }

    const order = await prisma.internalOrder.create({
      data: {
        productName,
        qty,
        distributor: distributor || null,
        note:        note        || null,
        updatedById: workerId,
        history: {
          create: {
            status:      InternalOrderStatus.Kreirano,
            changedById: workerId,
          },
        },
      },
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/interne-narudzbine");
    return { success: true, message: "Narudžbina kreirana.", order };
  } catch {
    return { success: false, message: "Greška pri kreiranju.", order: null };
  }
}

// ─── Izmijeni status ──────────────────────────────────────────────────────────

export async function updateInternalOrderStatus(
  orderId: string,
  status: InternalOrderStatus,
  workerId: string
) {
  try {
    await prisma.$transaction([
      prisma.internalOrder.update({
        where: { id: orderId },
        data:  { status, updatedById: workerId },
      }),
      prisma.internalOrderHistory.create({
        data: { internalOrderId: orderId, status, changedById: workerId },
      }),
    ]);

    revalidatePath("/interne-narudzbine");
    return { success: true, message: "Status ažuriran." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju." };
  }
}
