/*
  Warnings:

  - You are about to drop the column `isDone` on the `Notification` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('Normalno', 'Bitno', 'Hitno');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('NijeZavrseno', 'Zavrseno');

-- AlterTable
ALTER TABLE "public"."Notification" DROP COLUMN "isDone",
ADD COLUMN     "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'Normalno',
ADD COLUMN     "status" "public"."NotificationStatus" NOT NULL DEFAULT 'NijeZavrseno',
ADD COLUMN     "updatedById" UUID;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
