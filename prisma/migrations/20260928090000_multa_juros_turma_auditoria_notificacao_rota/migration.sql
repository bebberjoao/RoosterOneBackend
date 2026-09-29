-- Reformulação combinada: (1) políticas de multa/juros criáveis pelo financeiro, aplicadas por
-- Serviço e por Cobrança; (2) vínculo opcional de Reserva a uma Turma (aula); (3) campo `rota` na
-- notificação, para ela abrir a tela de origem; (4) ação de relatório de auditoria. Tudo aditivo:
-- colunas novas anuláveis, tabela nova, sem DROP.

-- ===================== 1. Notificação com rota =====================
ALTER TABLE "notificacoes" ADD COLUMN "rota" VARCHAR(200);

-- ===================== 2. Política de multa/juros (financeiro cria as próprias regras) =====================
CREATE TABLE "politicas_multa_juros" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "percentual_multa" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "percentual_juros_dia" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "dias_carencia" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_por_id" UUID,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,
    CONSTRAINT "politicas_multa_juros_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "politicas_multa_juros" ADD CONSTRAINT "politicas_multa_juros_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "servicos_financeiros" ADD COLUMN "politica_multa_juros_id" UUID;
ALTER TABLE "servicos_financeiros" ADD CONSTRAINT "servicos_financeiros_politica_multa_juros_id_fkey" FOREIGN KEY ("politica_multa_juros_id") REFERENCES "politicas_multa_juros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cobrancas" ADD COLUMN "politica_multa_juros_id" UUID;
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_politica_multa_juros_id_fkey" FOREIGN KEY ("politica_multa_juros_id") REFERENCES "politicas_multa_juros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===================== 3. Reserva vinculada a uma Turma (aula) =====================
ALTER TABLE "reservas" ADD COLUMN "turma_id" UUID;
CREATE INDEX "reservas_turma_id_idx" ON "reservas"("turma_id");
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===================== 4. Permissões (DADOS) =====================
-- 4a. Rooster Finance / /finance/policies — reaproveita quem já tem finance.dashboard.acessar.
INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", novas."nome", novas."descricao", novas."recurso", novas."acao", NOW()
FROM "permissoes" base
CROSS JOIN (VALUES
  ('finance.policies.acessar', 'Acessar políticas de multa/juros', '/finance/policies', 'acessar'),
  ('finance.policies.criar', 'Criar política de multa/juros', '/finance/policies', 'criar'),
  ('finance.policies.editar', 'Editar política de multa/juros', '/finance/policies', 'editar'),
  ('finance.policies.excluir', 'Excluir política de multa/juros', '/finance/policies', 'excluir')
) AS novas("nome", "descricao", "recurso", "acao")
WHERE base."nome" = 'finance.dashboard.acessar'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = novas."nome");

INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" base ON base."id" = up."permissao_id" AND base."nome" = 'finance.dashboard.acessar'
JOIN "permissoes" nova ON nova."nome" IN ('finance.policies.acessar', 'finance.policies.criar', 'finance.policies.editar', 'finance.policies.excluir')
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;

-- 4b. Rooster Hub / /hub/acessos / relatorio-auditoria — mesmo nível de quem já gerencia permissões.
INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", 'hub.acessos.relatorio-auditoria', 'Ver relatório de auditoria', base."recurso", 'relatorio-auditoria', NOW()
FROM "permissoes" base
WHERE base."nome" = 'hub.acessos.gerenciar-permissoes'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = 'hub.acessos.relatorio-auditoria');

INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" base ON base."id" = up."permissao_id" AND base."nome" = 'hub.acessos.gerenciar-permissoes'
JOIN "permissoes" nova ON nova."nome" = 'hub.acessos.relatorio-auditoria'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
