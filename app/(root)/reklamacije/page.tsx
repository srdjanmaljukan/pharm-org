import { getAllReclamations, getMailTemplates } from "@/lib/actions/reclamation.actions";
import { Metadata } from "next";
import ReclamationsClient from "./reclamations-client";

export const metadata: Metadata = { title: "Reklamacije" };

export default async function ReclamationsPage() {
  const [reclamations, templates] = await Promise.all([
    getAllReclamations(),
    getMailTemplates(),
  ]);

  return <ReclamationsClient reclamations={reclamations} templates={templates} />;
}
