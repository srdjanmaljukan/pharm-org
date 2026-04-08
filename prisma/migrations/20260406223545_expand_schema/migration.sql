-- CreateEnum
CREATE TYPE "public"."WorkerRole" AS ENUM ('ADMIN', 'RADNIK');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('Kreirano', 'Poručeno', 'Stiglo', 'Javljeno', 'ProkucanoNijeNaplaćeno', 'NaplaćenoNijeProkucano', 'Ostalo', 'Završeno');

-- CreateEnum
CREATE TYPE "public"."InternalOrderStatus" AS ENUM ('Kreirano', 'Poručeno', 'Stiglo', 'Završeno');

-- CreateEnum
CREATE TYPE "public"."ReclamationStatus" AS ENUM ('Otvorena', 'UProcesу', 'Riješena', 'Odbijena');

-- CreateEnum
CREATE TYPE "public"."WeekendDay" AS ENUM ('Subota', 'Nedjelja');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'NO_NAME',
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(6),
    "password" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "public"."Worker" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "public"."WorkerRole" NOT NULL DEFAULT 'RADNIK',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "personName" TEXT,
    "note" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'Kreirano',
    "distributor" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InternalOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "distributor" TEXT,
    "note" TEXT,
    "status" "public"."InternalOrderStatus" NOT NULL DEFAULT 'Kreirano',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "InternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reclamation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productName" TEXT NOT NULL,
    "distributor" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" "public"."ReclamationStatus" NOT NULL DEFAULT 'Otvorena',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "remindAt" TIMESTAMP(6) NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TargetItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productName" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TargetSaleEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "targetItemId" UUID NOT NULL,
    "qtySold" INTEGER NOT NULL,
    "note" TEXT,
    "enteredAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enteredById" UUID NOT NULL,

    CONSTRAINT "TargetSaleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlipperVariant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "size" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlipperVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SlipperStock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variantId" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "SlipperStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeekendShift" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "day" "public"."WeekendDay" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekendShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_WeekendShiftToWorker" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_WeekendShiftToWorker_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SlipperVariant_size_color_key" ON "public"."SlipperVariant"("size", "color");

-- CreateIndex
CREATE INDEX "_WeekendShiftToWorker_B_index" ON "public"."_WeekendShiftToWorker"("B");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Worker" ADD CONSTRAINT "Worker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InternalOrder" ADD CONSTRAINT "InternalOrder_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reclamation" ADD CONSTRAINT "Reclamation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TargetSaleEntry" ADD CONSTRAINT "TargetSaleEntry_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "public"."TargetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TargetSaleEntry" ADD CONSTRAINT "TargetSaleEntry_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlipperStock" ADD CONSTRAINT "SlipperStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."SlipperVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SlipperStock" ADD CONSTRAINT "SlipperStock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_WeekendShiftToWorker" ADD CONSTRAINT "_WeekendShiftToWorker_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."WeekendShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_WeekendShiftToWorker" ADD CONSTRAINT "_WeekendShiftToWorker_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
