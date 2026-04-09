import { getAllWorkers } from "@/lib/actions/worker.actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/db/prisma";
import { Metadata } from "next";
import AdminClient from "./admin-client";

export const metadata: Metadata = { title: "Admin panel" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  // Dohvatamo sve radnike i šaljemo ih klijentu
  // Provjera da li je korisnik ADMIN se radi PIN-om na klijentskoj strani
  const workers = await getAllWorkers();

  return (
    <AdminClient
      workers={workers}
      currentUserId={session.user.id}
    />
  );
}
