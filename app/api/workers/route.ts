import { NextResponse } from "next/server";
import { getAllWorkers } from "@/lib/actions/worker.actions";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workers = await getAllWorkers();
  return NextResponse.json(workers);
}
