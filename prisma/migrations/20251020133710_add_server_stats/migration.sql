-- CreateTable
CREATE TABLE "public"."server_stats" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "onlineCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "server_stats_guildId_idx" ON "public"."server_stats"("guildId");

-- CreateIndex
CREATE INDEX "server_stats_timestamp_idx" ON "public"."server_stats"("timestamp");
