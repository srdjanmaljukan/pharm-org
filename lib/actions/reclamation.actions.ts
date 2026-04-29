"use server";

import { prisma } from "@/db/prisma";
import { ReclamationStatus, ReclamationDistributorType } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// ─── Tipovi ───────────────────────────────────────────────────────────────────

export type ReclamationItemInput = {
  productName: string;
  qty: number;
  reason?: string;
  batchNumber?: string;
  expiryDate?: string;
};

// ─── Dohvati sve reklamacije ──────────────────────────────────────────────────

export async function getAllReclamations(limit = 0) {
  return await prisma.reclamation.findMany({
    orderBy: { createdAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
    include: {
      createdBy:  { select: { id: true, name: true } },
      updatedBy:  { select: { id: true, name: true } },
      items:      true,
      history: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { id: true, name: true } } },
      },
    },
  });
}

// ─── Dohvati mail šablone ─────────────────────────────────────────────────────

export async function getMailTemplates() {
  return await prisma.reclamationMailTemplate.findMany({
    orderBy: { distributorName: "asc" },
  });
}

// ─── Sačuvaj mail šablon (admin) ──────────────────────────────────────────────

export async function saveMailTemplate(data: {
  distributorName: string;
  toEmail: string;
  subject: string;
  bodyTemplate: string;
}) {
  try {
    await prisma.reclamationMailTemplate.upsert({
      where:  { distributorName: data.distributorName },
      update: { toEmail: data.toEmail, subject: data.subject, bodyTemplate: data.bodyTemplate },
      create: data,
    });
    revalidatePath("/reklamacije");
    return { success: true, message: "Šablon sačuvan." };
  } catch {
    return { success: false, message: "Greška pri čuvanju šablona." };
  }
}

// ─── Kreiraj reklamaciju ──────────────────────────────────────────────────────

export async function createReclamation(data: {
  distributorName: string;
  distributorType: ReclamationDistributorType;
  invoiceNumber?: string;
  reason?: string;
  note?: string;
  workerId: string;
  items: ReclamationItemInput[];
}) {
  try {
    if (!data.distributorName || !data.workerId || data.items.length === 0) {
      return { success: false, message: "Nedostaju obavezna polja.", reclamation: null };
    }

    const reclamation = await prisma.reclamation.create({
      data: {
        distributorName: data.distributorName,
        distributorType: data.distributorType,
        invoiceNumber:   data.invoiceNumber || null,
        reason:          data.reason || null,
        note:            data.note || null,
        createdById:     data.workerId,
        items: {
          create: data.items.map((item) => ({
            productName: item.productName,
            qty:         item.qty,
            reason:      item.reason || null,
            batchNumber: item.batchNumber || null,
            expiryDate:  item.expiryDate || null,
          })),
        },
        history: {
          create: {
            status:      ReclamationStatus.Otvorena,
            changedById: data.workerId,
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        items:     true,
        history: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { id: true, name: true } } },
        },
      },
    });

    revalidatePath("/reklamacije");
    return { success: true, message: "Reklamacija kreirana.", reclamation };
  } catch {
    return { success: false, message: "Greška pri kreiranju reklamacije.", reclamation: null };
  }
}

// ─── Izmijeni status ──────────────────────────────────────────────────────────

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
        data: { reclamationId, status, changedById: workerId, note: note || null },
      }),
    ]);
    revalidatePath("/reklamacije");
    return { success: true, message: "Status ažuriran." };
  } catch {
    return { success: false, message: "Greška pri ažuriranju." };
  }
}
