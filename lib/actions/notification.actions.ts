"use server";

import { prisma } from "@/db/prisma";
import { NotificationPriority, NotificationStatus } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Dohvati sve notifikacije ─────────────────────────────────────────────────

export async function getAllNotifications() {
  return await prisma.notification.findMany({
    orderBy: [{ status: "asc" }, { remindAt: "asc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });
}

// ─── Broj aktivnih notifikacija (za badge) ────────────────────────────────────

export async function getActiveNotificationCount(): Promise<number> {
  const now = new Date();
  return await prisma.notification.count({
    where: {
      status: NotificationStatus.NijeZavrseno,
      remindAt: { lte: now },
    },
  });
}

// ─── Kreiraj notifikaciju ─────────────────────────────────────────────────────

export async function createNotification(formData: FormData) {
  try {
    const title       = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const remindDate  = formData.get("remindDate") as string;
    const remindTime  = formData.get("remindTime") as string || "08:30";
    const priority    = formData.get("priority") as NotificationPriority;
    const workerId    = formData.get("workerId") as string;

    if (!title?.trim() || !remindDate || !workerId) {
      return { success: false, message: "Nedostaju obavezna polja." };
    }

    const remindAt = new Date(`${remindDate}T${remindTime}:00`);

    await prisma.notification.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        remindAt,
        priority: priority || NotificationPriority.Normalno,
        createdById: workerId,
      },
    });

    revalidatePath("/notifikacije");
    return { success: true, message: "Podsjetnik kreiran." };
  } catch {
    return { success: false, message: "Greška pri kreiranju." };
  }
}

// ─── Promijeni status ─────────────────────────────────────────────────────────

export async function updateNotificationStatus(
  id: string,
  status: NotificationStatus,
  workerId: string
) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { status, updatedById: workerId },
    });
    revalidatePath("/notifikacije");
    return { success: true, message: "Status ažuriran." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju." };
  }
}

// ─── Obriši notifikaciju ──────────────────────────────────────────────────────

export async function deleteNotification(id: string) {
  try {
    await prisma.notification.delete({ where: { id } });
    revalidatePath("/notifikacije");
    return { success: true, message: "Podsjetnik obrisan." };
  } catch {
    return { success: false, message: "Greška pri brisanju." };
  }
}
