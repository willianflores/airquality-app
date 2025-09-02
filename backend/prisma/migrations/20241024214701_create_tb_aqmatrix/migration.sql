-- CreateTable
CREATE TABLE "tb_aqmatrix" (
    "id" SERIAL NOT NULL,
    "mes" INTEGER,
    "hora" INTEGER,
    "total" INTEGER,

    CONSTRAINT "tb_aqmatrix_pkey" PRIMARY KEY ("id")
);
