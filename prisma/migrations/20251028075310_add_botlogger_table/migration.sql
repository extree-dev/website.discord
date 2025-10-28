-- CreateTable
CREATE TABLE "public"."BotLog" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "source" TEXT NOT NULL DEFAULT 'bot',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotLog_timestamp_idx" ON "public"."BotLog"("timestamp");

-- CreateIndex
CREATE INDEX "BotLog_type_idx" ON "public"."BotLog"("type");
