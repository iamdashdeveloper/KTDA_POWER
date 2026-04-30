/*
  Warnings:

  - The primary key for the `gura_cadastre` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `geom` on the `gura_cadastre` table. All the data in the column will be lost.
  - You are about to drop the column `ogc_fid` on the `gura_cadastre` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "gura_cadastre_geom_geom_idx";

-- AlterTable
ALTER TABLE "gura_cadastre" DROP CONSTRAINT "gura_cadastre_pkey",
DROP COLUMN "geom",
DROP COLUMN "ogc_fid",
ADD COLUMN     "geometry" geometry,
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "blkcolor" SET DATA TYPE VARCHAR,
ALTER COLUMN "blklinetyp" SET DATA TYPE VARCHAR,
ALTER COLUMN "blklinewt" SET DATA TYPE VARCHAR,
ALTER COLUMN "color" SET DATA TYPE VARCHAR,
ALTER COLUMN "docid" SET DATA TYPE VARCHAR,
ALTER COLUMN "docname" SET DATA TYPE VARCHAR,
ALTER COLUMN "docpath" SET DATA TYPE VARCHAR,
ALTER COLUMN "doctype" SET DATA TYPE VARCHAR,
ALTER COLUMN "docupdate" SET DATA TYPE VARCHAR,
ALTER COLUMN "docver" SET DATA TYPE VARCHAR,
ALTER COLUMN "elevation" SET DATA TYPE VARCHAR,
ALTER COLUMN "entcolor" SET DATA TYPE VARCHAR,
ALTER COLUMN "entity" SET DATA TYPE VARCHAR,
ALTER COLUMN "entlinetyp" SET DATA TYPE VARCHAR,
ALTER COLUMN "entlinewt" SET DATA TYPE VARCHAR,
ALTER COLUMN "extx" SET DATA TYPE VARCHAR,
ALTER COLUMN "exty" SET DATA TYPE VARCHAR,
ALTER COLUMN "extz" SET DATA TYPE VARCHAR,
ALTER COLUMN "globalwidt" SET DATA TYPE VARCHAR,
ALTER COLUMN "handle" SET DATA TYPE VARCHAR,
ALTER COLUMN "layer" SET DATA TYPE VARCHAR,
ALTER COLUMN "linetype" SET DATA TYPE VARCHAR,
ALTER COLUMN "linewt" SET DATA TYPE VARCHAR,
ALTER COLUMN "ltscale" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrcolor" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrfrzn" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrhandle" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrlinewt" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrlntype" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrlock" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyron" SET DATA TYPE VARCHAR,
ALTER COLUMN "lyrvpfrzn" SET DATA TYPE VARCHAR,
ALTER COLUMN "refname" SET DATA TYPE VARCHAR,
ALTER COLUMN "shape_leng" SET DATA TYPE VARCHAR,
ALTER COLUMN "thickness" SET DATA TYPE VARCHAR,
ADD CONSTRAINT "gura_cadastre_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "hydro_models" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentModelId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hydro_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hydro_objects" (
    "id" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "hydro_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hydro_objects_modelId_name_key" ON "hydro_objects"("modelId", "name");

-- CreateIndex
CREATE INDEX "gura_cadastre_geometry_geom_idx" ON "gura_cadastre" USING GIST ("geometry");

-- AddForeignKey
ALTER TABLE "hydro_objects" ADD CONSTRAINT "hydro_objects_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "hydro_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
