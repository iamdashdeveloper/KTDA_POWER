/*
  Warnings:

  - You are about to drop the column `images` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `parcelId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Complaint` table. All the data in the column will be lost.
  - Added the required column `name` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_parcelId_fkey";

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "images",
DROP COLUMN "location",
DROP COLUMN "ownerId",
DROP COLUMN "parcelId",
DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "plotNumber" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
