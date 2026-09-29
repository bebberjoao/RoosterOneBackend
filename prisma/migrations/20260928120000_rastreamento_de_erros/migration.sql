-- Rastreamento de erros: tabela nova para persistir toda exceção não-HTTP (erro inesperado,
-- status >= 500) capturada pelo filtro global (ver src/common/all-exceptions.filter.ts).
-- Aditivo: só tabela nova + permissão nova, sem DROP.

-- ===================== 1. Log de erro =====================
CREATE TABLE "logs_erro" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "metodo" VARCHAR(10),
    "rota" VARCHAR(300),
    "status_code" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "stack" TEXT,
    "criado_em" TIMESTAMP,
    CONSTRAINT "logs_erro_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "logs_erro_criado_em_idx" ON "logs_erro"("criado_em");
ALTER TABLE "logs_erro" ADD CONSTRAINT "logs_erro_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===================== 2. Permissão (DADOS) =====================
-- Rooster Hub / /hub/acessos / relatorio-erros — mesmo nível de quem já vê o relatório de auditoria.
INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", 'hub.acessos.relatorio-erros', 'Ver relatório de erros', base."recurso", 'relatorio-erros', NOW()
FROM "permissoes" base
WHERE base."nome" = 'hub.acessos.gerenciar-permissoes'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = 'hub.acessos.relatorio-erros');

INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" base ON base."id" = up."permissao_id" AND base."nome" = 'hub.acessos.gerenciar-permissoes'
JOIN "permissoes" nova ON nova."nome" = 'hub.acessos.relatorio-erros'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
