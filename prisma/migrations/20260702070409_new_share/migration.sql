/*
  Warnings:

  - You are about to drop the `SharedFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SharedFolder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SharedFile" DROP CONSTRAINT "SharedFile_fileId_fkey";

-- DropForeignKey
ALTER TABLE "SharedFolder" DROP CONSTRAINT "SharedFolder_folderId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "shareId" TEXT;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "shareId" TEXT;

-- DropTable
DROP TABLE "SharedFile";

-- DropTable
DROP TABLE "SharedFolder";

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "rootFolderId" TEXT,
    "rootFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Share_rootFolderId_key" ON "Share"("rootFolderId");

-- CreateIndex
CREATE UNIQUE INDEX "Share_rootFileId_key" ON "Share"("rootFileId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_rootFolderId_fkey" FOREIGN KEY ("rootFolderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_rootFileId_fkey" FOREIGN KEY ("rootFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
