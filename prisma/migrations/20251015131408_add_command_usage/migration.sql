-- CreateTable
CREATE TABLE "public"."CommandUsage" (
    "id" SERIAL NOT NULL,
    "guildId" VARCHAR(255) NOT NULL,
    "command" VARCHAR(100) NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" VARCHAR(255),

    CONSTRAINT "CommandUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommandUsage_guildId_idx" ON "public"."CommandUsage"("guildId");

-- CreateIndex
CREATE INDEX "CommandUsage_command_idx" ON "public"."CommandUsage"("command");

-- CreateIndex
CREATE INDEX "CommandUsage_timestamp_idx" ON "public"."CommandUsage"("timestamp");

-- CreateIndex
CREATE INDEX "CommandUsage_userId_idx" ON "public"."CommandUsage"("userId");
