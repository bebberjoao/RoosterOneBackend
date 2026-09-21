-- CreateTable
CREATE TABLE "produtos_financeiros" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(80),
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "estoque" INTEGER NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "unidade" VARCHAR(20) NOT NULL DEFAULT 'un',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "produtos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos_financeiros" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "categoria" VARCHAR(80),
    "frequencia" VARCHAR(20) NOT NULL DEFAULT 'unico',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "servicos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descontos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "unidade" VARCHAR(10) NOT NULL,
    "motivo" TEXT,
    "responsavel" VARCHAR(120),
    "vigencia_inicio" DATE,
    "vigencia_fim" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "descontos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "descontos_alunos" (
    "id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "desconto_id" UUID NOT NULL,
    "atribuido_em" TIMESTAMP,

    CONSTRAINT "descontos_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas" (
    "id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "descricao" VARCHAR(200) NOT NULL,
    "competencia" VARCHAR(20),
    "produto_id" UUID,
    "servico_id" UUID,
    "desconto_id" UUID,
    "valor_original" DECIMAL(10,2) NOT NULL,
    "valor_desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "multa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "juros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_pago" DECIMAL(10,2),
    "vencimento" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'aberto',
    "forma_pagamento" VARCHAR(30),
    "nosso_numero" VARCHAR(40),
    "linha_digitavel" VARCHAR(60),
    "pix_copia_e_cola" VARCHAR(255),
    "emitido_em" TIMESTAMP,
    "pago_em" TIMESTAMP,
    "negociado_em" TIMESTAMP,
    "motivo_cancelamento" TEXT,
    "criado_em" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "cobrancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_fiscais" (
    "id" UUID NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "cobranca_id" UUID NOT NULL,
    "caminho_pdf" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'emitida',
    "emitido_em" TIMESTAMP,

    CONSTRAINT "notas_fiscais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_financeiros_codigo_key" ON "produtos_financeiros"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "descontos_alunos_aluno_id_desconto_id_key" ON "descontos_alunos"("aluno_id", "desconto_id");

-- CreateIndex
CREATE UNIQUE INDEX "cobrancas_nosso_numero_key" ON "cobrancas"("nosso_numero");

-- CreateIndex
CREATE INDEX "cobrancas_aluno_id_idx" ON "cobrancas"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_fiscais_numero_key" ON "notas_fiscais"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "notas_fiscais_cobranca_id_key" ON "notas_fiscais"("cobranca_id");

-- AddForeignKey
ALTER TABLE "descontos_alunos" ADD CONSTRAINT "descontos_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "descontos_alunos" ADD CONSTRAINT "descontos_alunos_desconto_id_fkey" FOREIGN KEY ("desconto_id") REFERENCES "descontos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos_financeiros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_desconto_id_fkey" FOREIGN KEY ("desconto_id") REFERENCES "descontos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_fiscais" ADD CONSTRAINT "notas_fiscais_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "cobrancas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
