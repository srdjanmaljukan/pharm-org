/*
  Warnings:

  - You are about to drop the column `distributor` on the `Reclamation` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `Reclamation` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Reclamation` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Reclamation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distributorName` to the `Reclamation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ReclamationDistributorType" AS ENUM ('Sopharma', 'CentralniMagacin', 'Ostalo');

-- DropForeignKey
ALTER TABLE "public"."Reclamation" DROP CONSTRAINT "Reclamation_updatedById_fkey";

-- AlterTable
ALTER TABLE "public"."Reclamation" DROP COLUMN "distributor",
DROP COLUMN "productName",
DROP COLUMN "qty",
ADD COLUMN     "createdById" UUID NOT NULL,
ADD COLUMN     "distributorName" TEXT NOT NULL,
ADD COLUMN     "distributorType" "public"."ReclamationDistributorType" NOT NULL DEFAULT 'Ostalo',
ADD COLUMN     "invoiceNumber" TEXT,
ALTER COLUMN "reason" DROP NOT NULL,
ALTER COLUMN "updatedById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."ReclamationItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reclamationId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT,
    "batchNumber" TEXT,
    "expiryDate" TEXT,

    CONSTRAINT "ReclamationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReclamationMailTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "distributorName" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReclamationMailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReclamationMailTemplate_distributorName_key" ON "public"."ReclamationMailTemplate"("distributorName");

-- AddForeignKey
ALTER TABLE "public"."Reclamation" ADD CONSTRAINT "Reclamation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reclamation" ADD CONSTRAINT "Reclamation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReclamationItem" ADD CONSTRAINT "ReclamationItem_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "public"."Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
