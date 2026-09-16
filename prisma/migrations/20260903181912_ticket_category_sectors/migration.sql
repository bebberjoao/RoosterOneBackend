-- AlterTable
ALTER TABLE "categorias_tickets" ADD COLUMN     "setor_id" UUID;

-- AddForeignKey
ALTER TABLE "categorias_tickets" ADD CONSTRAINT "categorias_tickets_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
