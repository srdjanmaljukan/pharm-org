/*
  Warnings:

  - You are about to drop the `WeekendShift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_WeekendShiftToWorker` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_WeekendShiftToWorker" DROP CONSTRAINT "_WeekendShiftToWorker_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_WeekendShiftToWorker" DROP CONSTRAINT "_WeekendShiftToWorker_B_fkey";

-- DropTable
DROP TABLE "public"."WeekendShift";

-- DropTable
DROP TABLE "public"."_WeekendShiftToWorker";

-- DropEnum
DROP TYPE "public"."WeekendDay";

-- CreateTable
CREATE TABLE "public"."WorkerCycleLetter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workerId" UUID NOT NULL,
    "letter" TEXT NOT NULL,

    CONSTRAINT "WorkerCycleLetter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CycleStart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "CycleStart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerCycleLetter_workerId_key" ON "public"."WorkerCycleLetter"("workerId");

-- AddForeignKey
ALTER TABLE "public"."WorkerCycleLetter" ADD CONSTRAINT "WorkerCycleLetter_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CycleStart" ADD CONSTRAINT "CycleStart_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
