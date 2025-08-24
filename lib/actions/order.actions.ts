"use server";
import { prisma } from "@/db/prisma";

// Get all orders
export async function getAllOrders(limit = 0) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return orders;
}

// Get order by Id
