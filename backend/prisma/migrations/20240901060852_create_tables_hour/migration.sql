-- CreateTable
CREATE TABLE "hour" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hour_up" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "hour_up_pkey" PRIMARY KEY ("id")
);
