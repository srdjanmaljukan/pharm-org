import { Metadata } from "next";
import { getCycleLetters, getCycleStart, getActiveWorkers } from "@/lib/actions/shift.actions";
import ScheduleClient from "./schedule-client";

export const metadata: Metadata = { title: "Raspored vikenda" };

export default async function SchedulePage() {
  const [letters, cycleStart, workers] = await Promise.all([
    getCycleLetters(),
    getCycleStart(),
    getActiveWorkers(),
  ]);

  return (
    <ScheduleClient
      letters={letters}
      cycleStart={cycleStart ? cycleStart.startDate.toISOString() : null}
      workers={workers}
    />
  );
}
