-- Recuperação de senha por e-mail da conta do portal do Boost (aluno externo).
-- Tabela própria, separada de "redefinicoes_senha" (Hub), para manter isolados os dois mecanismos de login.
-- O token é armazenado apenas como hash SHA-256, com validade de 1 hora e uso único.
CREATE TABLE "redefinicoes_senha_boost" (
    "id" UUID NOT NULL,
    "boost_usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMP NOT NULL,
    "usado_em" TIMESTAMP,
    "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redefinicoes_senha_boost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "redefinicoes_senha_boost_token_hash_key" ON "redefinicoes_senha_boost"("token_hash");

CREATE INDEX "redefinicoes_senha_boost_boost_usuario_id_idx" ON "redefinicoes_senha_boost"("boost_usuario_id");

ALTER TABLE "redefinicoes_senha_boost"
  ADD CONSTRAINT "redefinicoes_senha_boost_boost_usuario_id_fkey"
  FOREIGN KEY ("boost_usuario_id") REFERENCES "boost_usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
