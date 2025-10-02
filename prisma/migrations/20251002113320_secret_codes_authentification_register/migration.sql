-- DropIndex
DROP INDEX "public"."secret_codes_code_idx";

-- DropIndex
DROP INDEX "public"."secret_codes_createdBy_idx";

-- DropIndex
DROP INDEX "public"."secret_codes_expiresAt_idx";

-- DropIndex
DROP INDEX "public"."secret_codes_used_idx";

-- AlterTable
ALTER TABLE "public"."secret_codes" ADD COLUMN     "sessionId" INTEGER,
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."secret_codes" ADD CONSTRAINT "secret_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."secret_codes" ADD CONSTRAINT "secret_codes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
