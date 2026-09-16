-- Rooster One — remoção do conceito de Perfil/Role
-- Arquitetura anterior: usuario -> perfil -> permissao
-- Arquitetura nova:     usuario -> setor (organização) + usuario -> permissao (autorização)
--
-- ORDEM: 1) criar tabela nova  2) consolidar permissões herdadas por perfil
--        3) remover as tabelas antigas.

-- 1) Tabela de permissões individuais por usuário.
CREATE TABLE "usuarios_permissoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3),

    CONSTRAINT "usuarios_permissoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_permissoes_usuario_id_permissao_id_key" ON "usuarios_permissoes"("usuario_id", "permissao_id");

ALTER TABLE "usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) MIGRAÇÃO DE DADOS: cada permissão que o usuário recebia via perfil
--    passa a existir como permissão individual (nenhum acesso é perdido).
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), sub.usuario_id, sub.permissao_id, now()
FROM (
  SELECT DISTINCT up."usuario_id" AS usuario_id, pp."permissao_id" AS permissao_id
  FROM "usuarios_perfis" up
  JOIN "perfis_permissoes" pp ON pp."perfil_id" = up."perfil_id"
) sub
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;

-- 3) Remoção das estruturas de perfil (a consolidação acima já rodou).
ALTER TABLE "perfis_permissoes" DROP CONSTRAINT IF EXISTS "perfis_permissoes_perfil_id_fkey";
ALTER TABLE "perfis_permissoes" DROP CONSTRAINT IF EXISTS "perfis_permissoes_permissao_id_fkey";
ALTER TABLE "usuarios_perfis" DROP CONSTRAINT IF EXISTS "usuarios_perfis_usuario_id_fkey";
ALTER TABLE "usuarios_perfis" DROP CONSTRAINT IF EXISTS "usuarios_perfis_perfil_id_fkey";

DROP TABLE IF EXISTS "perfis_permissoes";
DROP TABLE IF EXISTS "usuarios_perfis";
DROP TABLE IF EXISTS "perfis";
