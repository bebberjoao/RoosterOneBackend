-- Boost: o curso deixa de ter "dono" (professor) e passa a ser gerido por permissão; professores
-- entram como ORIENTADORES vinculados; o chat único do curso vira uma conversa por (curso, aluno).
--
-- ORDEM IMPORTANTE: as tabelas novas são criadas e preenchidas ANTES de as colunas antigas
-- (cursos_boost.professor_id, mensagens_boost.curso_id) serem removidas.

-- ===================== 1. Estrutura nova =====================
CREATE TABLE "cursos_orientadores_boost" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "criado_em" TIMESTAMP,
    CONSTRAINT "cursos_orientadores_boost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversas_boost" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "boost_usuario_id" UUID NOT NULL,
    "criado_em" TIMESTAMP,
    "ultima_mensagem_em" TIMESTAMP,
    CONSTRAINT "conversas_boost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cursos_orientadores_boost_curso_id_professor_id_key" ON "cursos_orientadores_boost"("curso_id", "professor_id");
CREATE UNIQUE INDEX "conversas_boost_curso_id_boost_usuario_id_key" ON "conversas_boost"("curso_id", "boost_usuario_id");

ALTER TABLE "cursos_orientadores_boost" ADD CONSTRAINT "cursos_orientadores_boost_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cursos_orientadores_boost" ADD CONSTRAINT "cursos_orientadores_boost_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversas_boost" ADD CONSTRAINT "conversas_boost_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversas_boost" ADD CONSTRAINT "conversas_boost_boost_usuario_id_fkey" FOREIGN KEY ("boost_usuario_id") REFERENCES "boost_usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===================== 2. Dono do curso -> orientador =====================
INSERT INTO "cursos_orientadores_boost" ("id", "curso_id", "professor_id", "criado_em")
SELECT gen_random_uuid(), "id", "professor_id", NOW() FROM "cursos_boost";

-- ===================== 3. Chat único do curso -> conversas por aluno =====================
-- Mensagens de ALUNO viram a conversa dele no curso. Mensagens de PROFESSOR eram dirigidas à
-- sala inteira (sem aluno de destino), então não há conversa a que pertençam: são descartadas.
ALTER TABLE "mensagens_boost" ADD COLUMN "conversa_id" UUID, ADD COLUMN "lida_em" TIMESTAMP;

INSERT INTO "conversas_boost" ("id", "curso_id", "boost_usuario_id", "criado_em", "ultima_mensagem_em")
SELECT gen_random_uuid(), "curso_id", "boost_usuario_id", MIN("criado_em"), MAX("criado_em")
FROM "mensagens_boost"
WHERE "boost_usuario_id" IS NOT NULL
GROUP BY "curso_id", "boost_usuario_id";

UPDATE "mensagens_boost" m
SET "conversa_id" = c."id", "lida_em" = m."criado_em"
FROM "conversas_boost" c
WHERE m."boost_usuario_id" IS NOT NULL
  AND c."curso_id" = m."curso_id" AND c."boost_usuario_id" = m."boost_usuario_id";

DELETE FROM "mensagens_boost" WHERE "conversa_id" IS NULL;

ALTER TABLE "mensagens_boost" ALTER COLUMN "conversa_id" SET NOT NULL;
ALTER TABLE "mensagens_boost" DROP CONSTRAINT "mensagens_boost_curso_id_fkey";
ALTER TABLE "mensagens_boost" DROP COLUMN "curso_id";
ALTER TABLE "mensagens_boost" ADD CONSTRAINT "mensagens_boost_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "conversas_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "mensagens_boost_conversa_id_criado_em_idx" ON "mensagens_boost"("conversa_id", "criado_em");

-- ===================== 4. Remove o "dono" =====================
ALTER TABLE "cursos_boost" DROP CONSTRAINT "cursos_boost_professor_id_fkey";
ALTER TABLE "cursos_boost" DROP COLUMN "professor_id", ADD COLUMN "certificado_texto" TEXT;

-- ===================== 5. Permissões (DADOS) =====================
-- Sem isto, todo professor que era "dono" de um curso viraria gestor de TODOS os cursos, porque
-- a mesma permissão passa a valer para o módulo inteiro. Idempotente.

INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", novas."nome", novas."descricao", novas."recurso", novas."acao", NOW()
FROM "permissoes" base
CROSS JOIN (VALUES
  ('boost.manage.certificado', 'Configurar certificado do curso', '/boost/manage', 'certificado'),
  ('boost.manage.vincular-orientadores', 'Vincular orientadores ao curso', '/boost/manage', 'vincular-orientadores'),
  ('boost.conversas.acessar', 'Acessar conversas com alunos', '/boost/conversas', 'acessar'),
  ('boost.conversas.responder', 'Responder alunos', '/boost/conversas', 'responder')
) AS novas("nome", "descricao", "recurso", "acao")
WHERE base."nome" = 'boost.manage.acessar'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = novas."nome");

-- Gestores (têm a permissão ampla) recebem as duas ações novas de gestão.
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" ampla ON ampla."id" = up."permissao_id" AND ampla."nome" = 'boost.manage.acessar'
JOIN "permissoes" nova ON nova."nome" IN ('boost.manage.certificado', 'boost.manage.vincular-orientadores')
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;

-- "Professores": tinham gerenciar-cursos SEM a permissão ampla. Viram orientadores (só conversas).
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" gc ON gc."id" = up."permissao_id" AND gc."nome" = 'boost.manage.gerenciar-cursos'
JOIN "permissoes" nova ON nova."nome" IN ('boost.conversas.acessar', 'boost.conversas.responder')
WHERE NOT EXISTS (
  SELECT 1 FROM "usuarios_permissoes" up2
  JOIN "permissoes" p2 ON p2."id" = up2."permissao_id" AND p2."nome" = 'boost.manage.acessar'
  WHERE up2."usuario_id" = up."usuario_id"
)
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;

DELETE FROM "usuarios_permissoes" up
USING "permissoes" p
WHERE up."permissao_id" = p."id"
  AND p."nome" IN ('boost.dashboard.acessar', 'boost.manage.gerenciar-cursos', 'boost.manage.gerenciar-conteudo', 'boost.manage.ver-progresso')
  AND NOT EXISTS (
    SELECT 1 FROM "usuarios_permissoes" up2
    JOIN "permissoes" p2 ON p2."id" = up2."permissao_id" AND p2."nome" = 'boost.manage.acessar'
    WHERE up2."usuario_id" = up."usuario_id"
  );

-- `mensagem` foi substituída por boost.conversas.responder.
DELETE FROM "permissoes" WHERE "nome" = 'boost.manage.mensagem';
