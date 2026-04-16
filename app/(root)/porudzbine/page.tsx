import { getAllOrders } from "@/lib/actions/order.actions";
import { getAllDistributors } from "@/lib/actions/distributor.actions";
import { Metadata } from "next";
import OrdersClient from "./orders-client";

export const metadata: Metadata = { title: "Porudžbine" };

export default async function OrdersPage() {
  const [orders, distributors] = await Promise.all([
    getAllOrders(),
    getAllDistributors(),
  ]);
  return <OrdersClient orders={orders} distributors={distributors} />;
}
