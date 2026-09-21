-- CreateIndex
CREATE INDEX "categorias_tickets_setor_id_idx" ON "categorias_tickets"("setor_id");

-- CreateIndex
CREATE INDEX "logs_auditoria_criado_em_idx" ON "logs_auditoria"("criado_em");

-- CreateIndex
CREATE INDEX "tickets_categoria_id_idx" ON "tickets"("categoria_id");

-- CreateIndex
CREATE INDEX "tickets_criado_em_idx" ON "tickets"("criado_em");
