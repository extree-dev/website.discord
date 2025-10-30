-- CreateTable
CREATE TABLE "public"."banned_users" (
    "id" SERIAL NOT NULL,
    "discordId" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "discriminator" VARCHAR(10) NOT NULL,
    "avatar" VARCHAR(255),
    "guildId" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannedBy" VARCHAR(255) NOT NULL,
    "bannedByUsername" VARCHAR(255) NOT NULL,
    "deleteDays" INTEGER NOT NULL DEFAULT 0,
    "unbannedAt" TIMESTAMP(3),
    "unbannedBy" VARCHAR(255),
    "unbannedByUsername" VARCHAR(255),
    "unbanReason" TEXT,

    CONSTRAINT "banned_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banned_users_discordId_idx" ON "public"."banned_users"("discordId");

-- CreateIndex
CREATE INDEX "banned_users_guildId_idx" ON "public"."banned_users"("guildId");

-- CreateIndex
CREATE INDEX "banned_users_bannedAt_idx" ON "public"."banned_users"("bannedAt");
