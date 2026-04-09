-- CreateTable
CREATE TABLE "public"."InternalOrderHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "internalOrderId" UUID NOT NULL,
    "status" "public"."InternalOrderStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" UUID NOT NULL,

    CONSTRAINT "InternalOrderHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."InternalOrderHistory" ADD CONSTRAINT "InternalOrderHistory_internalOrderId_fkey" FOREIGN KEY ("internalOrderId") REFERENCES "public"."InternalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InternalOrderHistory" ADD CONSTRAINT "InternalOrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
