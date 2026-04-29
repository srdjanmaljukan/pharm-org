import { getAllWorkers } from "@/lib/actions/worker.actions";
import { getAllDistributors } from "@/lib/actions/distributor.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import AdminClient from "./admin-client";
import { getMailTemplates } from "@/lib/actions/reclamation.actions";

export const metadata: Metadata = { title: "Admin panel" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const [workers, distributors] = await Promise.all([
    getAllWorkers(),
    getAllDistributors(),
  ]);

  const templates = await getMailTemplates();

  return (
    <AdminClient
      workers={workers}
      distributors={distributors}
      currentUserId={session.user.id}
      templates={templates}
    />
  );
}
