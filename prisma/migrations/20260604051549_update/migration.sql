/*
  Warnings:

  - You are about to drop the column `path` on the `File` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "path";

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT false;
