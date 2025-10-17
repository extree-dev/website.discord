-- CreateTable
CREATE TABLE "public"."command_stats" (
    "id" SERIAL NOT NULL,
    "command" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "executionTime" INTEGER NOT NULL,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_states" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "disabledCommands" TEXT[],

    CONSTRAINT "command_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."command_audit_log" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "executorId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "command_stats_command_idx" ON "public"."command_stats"("command");

-- CreateIndex
CREATE INDEX "command_stats_guildId_idx" ON "public"."command_stats"("guildId");

-- CreateIndex
CREATE INDEX "command_stats_timestamp_idx" ON "public"."command_stats"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "command_states_guildId_key" ON "public"."command_states"("guildId");

-- CreateIndex
CREATE INDEX "command_audit_log_guildId_idx" ON "public"."command_audit_log"("guildId");

-- CreateIndex
CREATE INDEX "command_audit_log_executedAt_idx" ON "public"."command_audit_log"("executedAt");
