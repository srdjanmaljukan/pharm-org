-- CreateTable
CREATE TABLE "public"."ReclamationHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reclamationId" UUID NOT NULL,
    "status" "public"."ReclamationStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" UUID NOT NULL,

    CONSTRAINT "ReclamationHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ReclamationHistory" ADD CONSTRAINT "ReclamationHistory_reclamationId_fkey" FOREIGN KEY ("reclamationId") REFERENCES "public"."Reclamation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReclamationHistory" ADD CONSTRAINT "ReclamationHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
