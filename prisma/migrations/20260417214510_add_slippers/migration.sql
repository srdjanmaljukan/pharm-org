/*
  Warnings:

  - You are about to drop the `SlipperStock` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[type,size,color]` on the table `SlipperVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `SlipperVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SlipperVariant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedById` to the `SlipperVariant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."SlipperType" AS ENUM ('Letnje', 'Zimske');

-- DropForeignKey
ALTER TABLE "public"."SlipperStock" DROP CONSTRAINT "SlipperStock_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."SlipperStock" DROP CONSTRAINT "SlipperStock_variantId_fkey";

-- DropIndex
DROP INDEX "public"."SlipperVariant_size_color_key";

-- AlterTable
ALTER TABLE "public"."SlipperVariant" ADD COLUMN     "qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "public"."SlipperType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" UUID NOT NULL;

-- DropTable
DROP TABLE "public"."SlipperStock";

-- CreateTable
CREATE TABLE "public"."SlipperSale" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variantId" UUID NOT NULL,
    "qtySold" INTEGER NOT NULL,
    "soldAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldById" UUID NOT NULL,

    CONSTRAINT "SlipperSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlipperVariant_type_size_color_key" ON "public"."SlipperVariant"("type", "size", "color");

-- AddForeignKey
ALTER TABLE "public"."SlipperVariant" ADD CONSTRAINT "SlipperVariant_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlipperSale" ADD CONSTRAINT "SlipperSale_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."SlipperVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlipperSale" ADD CONSTRAINT "SlipperSale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
