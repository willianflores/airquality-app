/*
  Warnings:

  - The primary key for the `day` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `day` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hour` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hour` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `hour_up` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `hour_up` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "day" DROP CONSTRAINT "day_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "day_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hour" DROP CONSTRAINT "hour_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "hour_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "hour_up" DROP CONSTRAINT "hour_up_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "hour_up_pkey" PRIMARY KEY ("id");
