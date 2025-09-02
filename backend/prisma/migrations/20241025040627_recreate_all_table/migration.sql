-- CreateTable
CREATE TABLE "day" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hour" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hour_up" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pm2_5" DOUBLE PRECISION,
    "municipio" TEXT NOT NULL,

    CONSTRAINT "hour_up_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aqmatrix" (
    "id" SERIAL NOT NULL,
    "mes" INTEGER,
    "hora" INTEGER,
    "total" INTEGER,

    CONSTRAINT "aqmatrix_pkey" PRIMARY KEY ("id")
);
