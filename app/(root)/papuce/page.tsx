import { getAllSlippers } from "@/lib/actions/slipper.actions";
import { Metadata } from "next";
import SlippersClient from "./slippers-client";

export const metadata: Metadata = { title: "Papuče" };

export default async function SlippersPage() {
  const slippers = await getAllSlippers();
  return <SlippersClient slippers={slippers} />;
}
