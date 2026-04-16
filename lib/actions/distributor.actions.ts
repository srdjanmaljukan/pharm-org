"use server";

import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";

export async function getAllDistributors() {
  return await prisma.distributor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createDistributor(name: string) {
  try {
    if (!name.trim()) return { success: false, message: "Naziv je obavezan." };

    await prisma.distributor.create({ data: { name: name.trim() } });

    revalidatePath("/admin");
    revalidatePath("/porudzbine");
    return { success: true, message: `Dobavljač "${name.trim()}" dodan.` };
  } catch {
    return { success: false, message: "Dobavljač s tim nazivom već postoji." };
  }
}

export async function deleteDistributor(id: string) {
  try {
    await prisma.distributor.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath("/admin");
    revalidatePath("/porudzbine");
    return { success: true, message: "Dobavljač uklonjen." };
  } catch {
    return { success: false, message: "Greška pri brisanju." };
  }
}
