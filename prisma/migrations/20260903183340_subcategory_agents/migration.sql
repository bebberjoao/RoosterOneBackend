-- CreateTable
CREATE TABLE "atendimentos_subcategorias" (
    "id" UUID NOT NULL,
    "subcategoria_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP,

    CONSTRAINT "atendimentos_subcategorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "atendimentos_subcategorias_subcategoria_id_usuario_id_key" ON "atendimentos_subcategorias"("subcategoria_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "atendimentos_subcategorias" ADD CONSTRAINT "atendimentos_subcategorias_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos_subcategorias" ADD CONSTRAINT "atendimentos_subcategorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
