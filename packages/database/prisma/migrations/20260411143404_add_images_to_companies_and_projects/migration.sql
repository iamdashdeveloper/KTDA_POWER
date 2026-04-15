-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
