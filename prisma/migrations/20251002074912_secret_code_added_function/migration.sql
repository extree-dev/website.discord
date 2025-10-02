-- AlterTable
ALTER TABLE "public"."profiles" ADD COLUMN     "registrationCode" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "registrationCodeUsed" TEXT;

-- CreateTable
CREATE TABLE "public"."secret_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "secret_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secret_codes_code_key" ON "public"."secret_codes"("code");

-- CreateIndex
CREATE INDEX "secret_codes_code_idx" ON "public"."secret_codes"("code");

-- CreateIndex
CREATE INDEX "secret_codes_createdBy_idx" ON "public"."secret_codes"("createdBy");

-- CreateIndex
CREATE INDEX "secret_codes_used_idx" ON "public"."secret_codes"("used");

-- CreateIndex
CREATE INDEX "secret_codes_expiresAt_idx" ON "public"."secret_codes"("expiresAt");
