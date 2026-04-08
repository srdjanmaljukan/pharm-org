"use server";
import { prisma } from "@/db/prisma";
import { OrderStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati sve porudžbine (sa posljednjim radnikom) ────────────────────────

export async function getAllOrders(limit = 0) {
  return await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
    include: {
      updatedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Dohvati historiju jedne porudžbine ───────────────────────────────────────

export async function getOrderHistory(orderId: string) {
  return await prisma.orderHistory.findMany({
    where: { orderId },
    orderBy: { changedAt: "desc" },
    include: {
      changedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Kreiraj porudžbinu ───────────────────────────────────────────────────────

export async function createOrder(formData: FormData) {
  try {
    const productName = formData.get("productName") as string;
    const qty         = Number(formData.get("qty"));
    const phoneNumber = formData.get("phoneNumber") as string;
    const personName  = formData.get("personName") as string | null;
    const note        = formData.get("note") as string | null;
    const distributor = formData.get("distributor") as string | null;
    const workerId    = formData.get("workerId") as string;

    if (!productName || !phoneNumber || !workerId) {
      return { success: false, message: "Nedostaju obavezna polja.", order: null };
    }

    const order = await prisma.order.create({
      data: {
        productName,
        qty,
        phoneNumber,
        personName:  personName  || null,
        note:        note        || null,
        distributor: distributor || null,
        updatedById: workerId,
        // Kreiramo i prvi zapis u historiji
        history: {
          create: {
            status:     OrderStatus.Kreirano,
            changedById: workerId,
          },
        },
      },
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/porudzbine");
    return { success: true, message: "Porudžbina kreirana.", order };
  } catch {
    return { success: false, message: "Greška pri kreiranju porudžbine.", order: null };
  }
}

// ─── Izmijeni status porudžbine ───────────────────────────────────────────────

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  workerId: string
) {
  try {
    // Ažuriraj status i dodaj zapis u historiju (u jednoj transakciji)
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data:  { status, updatedById: workerId },
      }),
      prisma.orderHistory.create({
        data: { orderId, status, changedById: workerId },
      }),
    ]);

    revalidatePath("/porudzbine");
    return { success: true, message: "Status ažuriran." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju statusa." };
  }
}
