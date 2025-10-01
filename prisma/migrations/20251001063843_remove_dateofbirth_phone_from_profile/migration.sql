/*
  Warnings:

  - You are about to drop the column `dateOfBirth` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."profiles" DROP COLUMN "dateOfBirth",
DROP COLUMN "phone";
