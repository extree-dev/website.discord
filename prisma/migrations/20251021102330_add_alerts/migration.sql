-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "data" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_guildId_idx" ON "public"."Alert"("guildId");

-- CreateIndex
CREATE INDEX "Alert_timestamp_idx" ON "public"."Alert"("timestamp");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "public"."Alert"("status");
