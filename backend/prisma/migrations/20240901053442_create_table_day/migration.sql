-- CreateTable
CREATE TABLE "day" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION NOT NULL,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "day_pkey" PRIMARY KEY ("id")
);
