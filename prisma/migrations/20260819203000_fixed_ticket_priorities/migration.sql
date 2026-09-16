ALTER TABLE "tickets"
DROP CONSTRAINT IF EXISTS "tickets_prioridade_id_fkey";

ALTER TABLE "tickets"
ALTER COLUMN "prioridade_id" TYPE TEXT USING "prioridade_id"::text;

ALTER TABLE "prioridades_tickets"
ALTER COLUMN "id" TYPE TEXT USING "id"::text;

ALTER TABLE "tickets"
ADD CONSTRAINT "tickets_prioridade_id_fkey"
FOREIGN KEY ("prioridade_id") REFERENCES "prioridades_tickets"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "prioridades_tickets" ("id", "nome", "cor", "criado_em") VALUES
  ('1', 'baixa', 'oklch(0.72 0.1 200)', CURRENT_TIMESTAMP),
  ('2', 'media', 'oklch(0.72 0.14 90)', CURRENT_TIMESTAMP),
  ('3', 'alta', 'oklch(0.68 0.18 40)', CURRENT_TIMESTAMP),
  ('4', 'urgente', 'oklch(0.6 0.22 25)', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "nome" = EXCLUDED."nome", "cor" = EXCLUDED."cor";