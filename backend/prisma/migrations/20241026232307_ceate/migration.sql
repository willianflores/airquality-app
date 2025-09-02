-- CreateTable
CREATE TABLE "mun_days_up" (
    "id" SERIAL NOT NULL,
    "municipio" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "days_up" INTEGER NOT NULL,

    CONSTRAINT "mun_days_up_pkey" PRIMARY KEY ("id")
);
