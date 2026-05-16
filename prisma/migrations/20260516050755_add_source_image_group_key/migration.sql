/*
  Warnings:

  - A unique constraint covering the columns `[sourceImageGroupKey]` on the table `Recipe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "sourceImageGroupKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_sourceImageGroupKey_key" ON "Recipe"("sourceImageGroupKey");
