-- Questões das atividades do Rooster Learn: enunciado, texto e imagem de apoio, tipos objetivos e discursivos,
-- alternativas com gabarito e respostas do aluno por questão, com pontuação automática ou atribuída pelo professor.
-- O anexo de entrega pode responder a uma questão do tipo "arquivo" (anexos_entrega.questao_id, opcional).

-- AlterTable
ALTER TABLE "anexos_entrega" ADD COLUMN     "questao_id" UUID;

-- CreateTable
CREATE TABLE "questoes_atividade" (
    "id" UUID NOT NULL,
    "atividade_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "tipo" VARCHAR(20) NOT NULL,
    "enunciado" TEXT NOT NULL,
    "texto_apoio" TEXT,
    "imagem_caminho" VARCHAR(255),
    "imagem_nome" VARCHAR(255),
    "imagem_tipo" VARCHAR(80),
    "pontos" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,

    CONSTRAINT "questoes_atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alternativas_questao" (
    "id" UUID NOT NULL,
    "questao_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "texto" TEXT NOT NULL,
    "correta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "alternativas_questao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respostas_questao" (
    "id" UUID NOT NULL,
    "entrega_id" UUID NOT NULL,
    "questao_id" UUID NOT NULL,
    "alternativas_ids" TEXT,
    "texto" TEXT,
    "pontuacao" DECIMAL(6,2),
    "corrigida_automaticamente" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "respostas_questao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questoes_atividade_atividade_id_idx" ON "questoes_atividade"("atividade_id");

-- CreateIndex
CREATE INDEX "alternativas_questao_questao_id_idx" ON "alternativas_questao"("questao_id");

-- CreateIndex
CREATE UNIQUE INDEX "respostas_questao_entrega_id_questao_id_key" ON "respostas_questao"("entrega_id", "questao_id");

-- AddForeignKey
ALTER TABLE "anexos_entrega" ADD CONSTRAINT "anexos_entrega_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questoes_atividade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questoes_atividade" ADD CONSTRAINT "questoes_atividade_atividade_id_fkey" FOREIGN KEY ("atividade_id") REFERENCES "atividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alternativas_questao" ADD CONSTRAINT "alternativas_questao_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questoes_atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_questao" ADD CONSTRAINT "respostas_questao_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respostas_questao" ADD CONSTRAINT "respostas_questao_questao_id_fkey" FOREIGN KEY ("questao_id") REFERENCES "questoes_atividade"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Dados: a ação "editar-questoes" já constava do catálogo, sem funcionalidade correspondente. É concedida a quem
-- já cria atividades, para que os professores possam montar as questões sem nova concessão manual. Idempotente.
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", questoes."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" criar ON criar."id" = up."permissao_id" AND criar."nome" = 'learn.classes.criar-atividade'
JOIN "permissoes" questoes ON questoes."nome" = 'learn.classes.editar-questoes'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
