import { getAllInternalOrders } from "@/lib/actions/internal-order.actions";
import { Metadata } from "next";
import InternalOrdersClient from "./internal-orders-client";

export const metadata: Metadata = { title: "Narudžbine za apoteku" };

export default async function InternalOrdersPage() {
  const orders = await getAllInternalOrders();
  return <InternalOrdersClient orders={orders} />;
}
