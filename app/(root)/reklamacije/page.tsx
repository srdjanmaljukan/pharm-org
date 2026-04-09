import { getAllReclamations } from "@/lib/actions/reclamation.actions";
import { Metadata } from "next";
import ReclamationsClient from "./reclamations-client";

export const metadata: Metadata = { title: "Reklamacije" };

export default async function ReclamationsPage() {
  const reclamations = await getAllReclamations();
  return <ReclamationsClient reclamations={reclamations} />;
}
