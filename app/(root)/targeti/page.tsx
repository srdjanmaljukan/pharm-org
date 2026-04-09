import { getTargetItems } from "@/lib/actions/target.actions";
import { Metadata } from "next";
import TargetsClient from "./targets-client";

export const metadata: Metadata = { title: "Targetirani artikli" };

export default async function TargetsPage() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const items = await getTargetItems(month, year);

  return <TargetsClient items={items} currentMonth={month} currentYear={year} />;
}
