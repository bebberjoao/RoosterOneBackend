-- CreateTable
CREATE TABLE "boost_usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,

    CONSTRAINT "boost_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_boost" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "descricao" TEXT,
    "categoria" VARCHAR(80),
    "nivel" VARCHAR(20) NOT NULL DEFAULT 'iniciante',
    "carga_horaria" INTEGER NOT NULL,
    "capa" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    "emite_certificado" BOOLEAN NOT NULL DEFAULT true,
    "professor_id" UUID NOT NULL,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "cursos_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos_boost" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modulos_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aulas_boost" (
    "id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'texto',
    "conteudo_url" VARCHAR(500),
    "conteudo_texto" TEXT,
    "duracao_min" INTEGER,

    CONSTRAINT "aulas_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiais_apoio_boost" (
    "id" UUID NOT NULL,
    "aula_id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "caminho" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(80),
    "tamanho" BIGINT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "materiais_apoio_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas_boost" (
    "id" UUID NOT NULL,
    "boost_usuario_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativa',
    "progresso_pct" INTEGER NOT NULL DEFAULT 0,
    "matriculado_em" TIMESTAMP,
    "concluido_em" TIMESTAMP,

    CONSTRAINT "matriculas_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progresso_aulas_boost" (
    "id" UUID NOT NULL,
    "matricula_id" UUID NOT NULL,
    "aula_id" UUID NOT NULL,
    "concluido_em" TIMESTAMP,

    CONSTRAINT "progresso_aulas_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_boost" (
    "id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "boost_usuario_id" UUID,
    "professor_id" UUID,
    "mensagem" TEXT NOT NULL,
    "criado_em" TIMESTAMP,

    CONSTRAINT "mensagens_boost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_boost" (
    "id" UUID NOT NULL,
    "matricula_id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "caminho_pdf" VARCHAR(255) NOT NULL,
    "emitido_em" TIMESTAMP,

    CONSTRAINT "certificados_boost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boost_usuarios_email_key" ON "boost_usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_boost_slug_key" ON "cursos_boost"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_boost_boost_usuario_id_curso_id_key" ON "matriculas_boost"("boost_usuario_id", "curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "progresso_aulas_boost_matricula_id_aula_id_key" ON "progresso_aulas_boost"("matricula_id", "aula_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_boost_matricula_id_key" ON "certificados_boost"("matricula_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_boost_codigo_key" ON "certificados_boost"("codigo");

-- AddForeignKey
ALTER TABLE "cursos_boost" ADD CONSTRAINT "cursos_boost_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modulos_boost" ADD CONSTRAINT "modulos_boost_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aulas_boost" ADD CONSTRAINT "aulas_boost_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiais_apoio_boost" ADD CONSTRAINT "materiais_apoio_boost_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_boost" ADD CONSTRAINT "matriculas_boost_boost_usuario_id_fkey" FOREIGN KEY ("boost_usuario_id") REFERENCES "boost_usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_boost" ADD CONSTRAINT "matriculas_boost_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresso_aulas_boost" ADD CONSTRAINT "progresso_aulas_boost_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progresso_aulas_boost" ADD CONSTRAINT "progresso_aulas_boost_aula_id_fkey" FOREIGN KEY ("aula_id") REFERENCES "aulas_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_boost" ADD CONSTRAINT "mensagens_boost_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_boost" ADD CONSTRAINT "mensagens_boost_boost_usuario_id_fkey" FOREIGN KEY ("boost_usuario_id") REFERENCES "boost_usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_boost" ADD CONSTRAINT "mensagens_boost_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificados_boost" ADD CONSTRAINT "certificados_boost_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas_boost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
