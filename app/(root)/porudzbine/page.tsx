import { getAllOrders } from "@/lib/actions/order.actions";
import { Metadata } from "next";
import OrdersClient from "./orders-client";

export const metadata: Metadata = { title: "Porudžbine" };

export default async function OrdersPage() {
  const orders = await getAllOrders();
  return <OrdersClient orders={orders} />;
}
