ALTER TABLE "categorias_tickets"
ADD COLUMN "sla_horas" INTEGER NOT NULL DEFAULT 8;

ALTER TABLE "subcategorias_tickets"
ADD COLUMN "sla_horas" INTEGER NOT NULL DEFAULT 8;