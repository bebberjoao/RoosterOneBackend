-- Rooster One — fecha lacunas de dado que so existiam no frontend (mock):
-- conversa e historico de reserva, motivo de cancelamento, recursos do
-- ambiente, tags/favorito de chamado.

-- Ticket: tags e favorito
ALTER TABLE "tickets" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tickets" ADD COLUMN "favorito" BOOLEAN NOT NULL DEFAULT false;

-- Ambiente: recursos (tags como projetor, som, etc.)
ALTER TABLE "ambientes" ADD COLUMN "recursos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Reserva: motivo de cancelamento
ALTER TABLE "reservas" ADD COLUMN "motivo_cancelamento" TEXT;

-- Conversa da reserva (espelha mensagens_tickets)
CREATE TABLE "reservas_mensagens" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_mensagens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservas_mensagens_reserva_id_criado_em_idx" ON "reservas_mensagens"("reserva_id", "criado_em");

ALTER TABLE "reservas_mensagens" ADD CONSTRAINT "reservas_mensagens_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservas_mensagens" ADD CONSTRAINT "reservas_mensagens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historico da reserva (espelha historico_tickets)
CREATE TABLE "reservas_historico" (
    "id" UUID NOT NULL,
    "reserva_id" UUID NOT NULL,
    "usuario_id" UUID,
    "campo" VARCHAR(100),
    "valor_antigo" TEXT,
    "valor_novo" TEXT,
    "criado_em" TIMESTAMP(3),

    CONSTRAINT "reservas_historico_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "reservas_historico" ADD CONSTRAINT "reservas_historico_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservas_historico" ADD CONSTRAINT "reservas_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
