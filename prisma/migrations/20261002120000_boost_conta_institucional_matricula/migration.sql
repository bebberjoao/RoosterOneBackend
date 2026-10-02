-- Vínculo opcional entre a conta do portal Boost e a conta institucional (login institucional no portal).
-- Nulo para o aluno externo. Único: cada usuário institucional possui no máximo uma conta Boost.
ALTER TABLE "boost_usuarios" ADD COLUMN "usuario_id" UUID;

CREATE UNIQUE INDEX "boost_usuarios_usuario_id_key" ON "boost_usuarios"("usuario_id");

ALTER TABLE "boost_usuarios"
  ADD CONSTRAINT "boost_usuarios_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dados: permissão de matrícula manual pela gestão do Boost, concedida a quem já gerencia cursos,
-- para que a funcionalidade nova não fique inacessível a quem administra o Boost. Idempotente.
INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", 'boost.manage.matricular', 'Matricular e cancelar matrícula de alunos', base."recurso", 'matricular', NOW()
FROM "permissoes" base
WHERE base."nome" = 'boost.manage.gerenciar-cursos'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = 'boost.manage.matricular');

INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" gestao ON gestao."id" = up."permissao_id" AND gestao."nome" = 'boost.manage.gerenciar-cursos'
JOIN "permissoes" nova ON nova."nome" = 'boost.manage.matricular'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
