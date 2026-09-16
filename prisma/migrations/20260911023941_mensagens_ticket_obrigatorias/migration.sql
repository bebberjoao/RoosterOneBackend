/*
  Warnings:

  - Made the column `ticket_id` on table `mensagens_tickets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `usuario_id` on table `mensagens_tickets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `criado_em` on table `mensagens_tickets` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "mensagens_tickets" DROP CONSTRAINT "mensagens_tickets_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "mensagens_tickets" DROP CONSTRAINT "mensagens_tickets_usuario_id_fkey";

-- AlterTable
ALTER TABLE "mensagens_tickets" ADD COLUMN     "removido_em" TIMESTAMP,
ALTER COLUMN "ticket_id" SET NOT NULL,
ALTER COLUMN "usuario_id" SET NOT NULL,
ALTER COLUMN "criado_em" SET NOT NULL,
ALTER COLUMN "criado_em" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "mensagens_tickets_ticket_id_criado_em_idx" ON "mensagens_tickets"("ticket_id", "criado_em");

-- AddForeignKey
ALTER TABLE "mensagens_tickets" ADD CONSTRAINT "mensagens_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_tickets" ADD CONSTRAINT "mensagens_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
