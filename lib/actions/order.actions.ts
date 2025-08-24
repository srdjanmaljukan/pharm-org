"use server";
import { prisma } from "@/db/prisma";

// Get all orders
export async function getAllOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  return orders;
}

// Get order by Id
