import { getAllWorkers } from "@/lib/actions/worker.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { Metadata } from "next";
import WorkersClient from "./workers-client";

export const metadata: Metadata = { title: "Upravljanje radnicima" };

export default async function WorkersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Provjeri da li je prijavljeni korisnik admin radnik
  const adminWorker = await prisma.worker.findFirst({
    where: { userId: session.user.id, role: "ADMIN", isActive: true },
  });

  if (!adminWorker) redirect("/");

  const workers = await getAllWorkers();

  return (
    <WorkersClient
      workers={workers}
      currentUserId={session.user.id}
      adminWorkerId={adminWorker.id}
    />
  );
}
