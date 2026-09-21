-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "serie_id" UUID,
ADD COLUMN     "serie_total" INTEGER;

-- CreateIndex
CREATE INDEX "reservas_serie_id_idx" ON "reservas"("serie_id");
