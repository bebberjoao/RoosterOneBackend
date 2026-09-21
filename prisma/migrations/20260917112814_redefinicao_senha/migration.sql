-- CreateTable
CREATE TABLE "redefinicoes_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMP NOT NULL,
    "usado_em" TIMESTAMP,
    "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redefinicoes_senha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redefinicoes_senha_token_hash_key" ON "redefinicoes_senha"("token_hash");

-- AddForeignKey
ALTER TABLE "redefinicoes_senha" ADD CONSTRAINT "redefinicoes_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
