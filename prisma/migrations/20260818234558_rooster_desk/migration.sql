-- CreateTable
CREATE TABLE "categorias_tickets" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,

    CONSTRAINT "categorias_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategorias_tickets" (
    "id" UUID NOT NULL,
    "categoria_id" UUID,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,

    CONSTRAINT "subcategorias_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prioridades_tickets" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "cor" VARCHAR(20),
    "criado_em" TIMESTAMP,

    CONSTRAINT "prioridades_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_tickets" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "ordem" INTEGER,
    "encerrado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP,

    CONSTRAINT "status_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "protocolo" VARCHAR(30),
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuario_id" UUID,
    "tecnico_id" UUID,
    "categoria_id" UUID,
    "subcategoria_id" UUID,
    "prioridade_id" UUID,
    "status_id" UUID,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,
    "encerrado_em" TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_tickets" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "usuario_id" UUID,
    "mensagem" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP,

    CONSTRAINT "mensagens_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_tickets" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "usuario_id" UUID,
    "nome_arquivo" VARCHAR(255),
    "caminho" TEXT,
    "tipo" VARCHAR(80),
    "tamanho" BIGINT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "anexos_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_tickets" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "usuario_id" UUID,
    "campo" VARCHAR(100),
    "valor_antigo" TEXT,
    "valor_novo" TEXT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "historico_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes_tickets" (
    "id" UUID NOT NULL,
    "ticket_id" UUID,
    "usuario_id" UUID,
    "nota" INTEGER,
    "comentario" TEXT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "avaliacoes_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_protocolo_key" ON "tickets"("protocolo");

-- AddForeignKey
ALTER TABLE "subcategorias_tickets" ADD CONSTRAINT "subcategorias_tickets_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "subcategorias_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_prioridade_id_fkey" FOREIGN KEY ("prioridade_id") REFERENCES "prioridades_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "status_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_tickets" ADD CONSTRAINT "mensagens_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_tickets" ADD CONSTRAINT "mensagens_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_tickets" ADD CONSTRAINT "anexos_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_tickets" ADD CONSTRAINT "anexos_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_tickets" ADD CONSTRAINT "historico_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_tickets" ADD CONSTRAINT "historico_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_tickets" ADD CONSTRAINT "avaliacoes_tickets_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes_tickets" ADD CONSTRAINT "avaliacoes_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
