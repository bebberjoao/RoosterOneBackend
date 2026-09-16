-- CreateTable
CREATE TABLE "campus" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "responsavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "cor" TEXT,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocos" (
    "id" UUID NOT NULL,
    "campus_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "andares" INTEGER NOT NULL DEFAULT 1,
    "responsavel" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "blocos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambientes" (
    "id" UUID NOT NULL,
    "campus_id" UUID NOT NULL,
    "bloco_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "andar" INTEGER NOT NULL DEFAULT 0,
    "numero" TEXT,
    "tipo" VARCHAR(40) NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 0,
    "area" DECIMAL(8,2),
    "descricao" TEXT,
    "capa" TEXT,
    "galeria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(30) NOT NULL DEFAULT 'disponivel',
    "horario_abertura" VARCHAR(20),
    "dias_funcionamento" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duracao_minutos" INTEGER,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "ambientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "ambiente_id" UUID NOT NULL,
    "responsavel_id" UUID,
    "responsavel" VARCHAR(120) NOT NULL,
    "setor_id" UUID,
    "setor" VARCHAR(120),
    "evento" VARCHAR(200) NOT NULL,
    "finalidade" TEXT,
    "data" DATE NOT NULL,
    "horario_inicio" VARCHAR(20) NOT NULL,
    "horario_fim" VARCHAR(20) NOT NULL,
    "participantes" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) NOT NULL DEFAULT 'analise',
    "recorrencia" VARCHAR(20) NOT NULL DEFAULT 'unica',
    "observacoes" TEXT,
    "decidido_por" UUID,
    "decidido_em" TIMESTAMP,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimonio_categorias" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "tom" VARCHAR(40),
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "patrimonio_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimonio_setores" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "responsavel" TEXT,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "patrimonio_setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimonio" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "tag" VARCHAR(80) NOT NULL,
    "categoria_id" UUID NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "serial" TEXT,
    "localizacao_id" UUID,
    "localizacao" VARCHAR(200),
    "setor_id" UUID,
    "setor" VARCHAR(120),
    "responsavel_user_id" UUID,
    "responsavel" VARCHAR(120),
    "status" VARCHAR(30) NOT NULL DEFAULT 'disponivel',
    "condicao" VARCHAR(30) NOT NULL DEFAULT 'bom',
    "adquirido_em" DATE,
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "foto" TEXT,
    "chamado_manutencao_id" UUID,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "patrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patrimonio_movimentacoes" (
    "id" UUID NOT NULL,
    "patrimonio_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "origem" TEXT,
    "destino" TEXT,
    "usuario" VARCHAR(120) NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "patrimonio_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campus_codigo_key" ON "campus"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "blocos_campus_id_codigo_key" ON "blocos"("campus_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ambientes_codigo_key" ON "ambientes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_codigo_key" ON "reservas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "patrimonio_categorias_nome_key" ON "patrimonio_categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "patrimonio_setores_nome_key" ON "patrimonio_setores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "patrimonio_tag_key" ON "patrimonio"("tag");

-- AddForeignKey
ALTER TABLE "blocos" ADD CONSTRAINT "blocos_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambientes" ADD CONSTRAINT "ambientes_bloco_id_fkey" FOREIGN KEY ("bloco_id") REFERENCES "blocos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_ambiente_id_fkey" FOREIGN KEY ("ambiente_id") REFERENCES "ambientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonio" ADD CONSTRAINT "patrimonio_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "patrimonio_categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonio" ADD CONSTRAINT "patrimonio_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "patrimonio_setores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patrimonio_movimentacoes" ADD CONSTRAINT "patrimonio_movimentacoes_patrimonio_id_fkey" FOREIGN KEY ("patrimonio_id") REFERENCES "patrimonio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
