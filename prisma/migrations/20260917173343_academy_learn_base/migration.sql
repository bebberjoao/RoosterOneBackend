-- CreateTable
CREATE TABLE "cursos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "grau" VARCHAR(30) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos_letivos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(20) NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP,

    CONSTRAINT "periodos_letivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disciplinas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "curso_id" UUID NOT NULL,
    "carga_horaria" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "disciplinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "titulacao" VARCHAR(50),
    "departamento" VARCHAR(100),
    "carga_horaria_semanal" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "ra" VARCHAR(20) NOT NULL,
    "curso_id" UUID NOT NULL,
    "semestre" INTEGER NOT NULL DEFAULT 1,
    "situacao" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "disciplina_id" UUID NOT NULL,
    "periodo_letivo_id" UUID NOT NULL,
    "professor_id" UUID,
    "turno" VARCHAR(20),
    "capacidade" INTEGER NOT NULL DEFAULT 0,
    "sala" VARCHAR(150),
    "horario" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'aberta',
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas" (
    "id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "matriculas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_frequencia" (
    "id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "presenca" VARCHAR(20) NOT NULL,
    "registrado_por_id" UUID,
    "criado_em" TIMESTAMP,

    CONSTRAINT "registros_frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_avaliativos" (
    "id" UUID NOT NULL,
    "turma_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "peso" DECIMAL(4,3) NOT NULL,
    "nota_maxima" DECIMAL(4,2) NOT NULL DEFAULT 10,
    "origem" VARCHAR(10) NOT NULL DEFAULT 'manual',
    "atividade_id" UUID,
    "criado_em" TIMESTAMP,

    CONSTRAINT "itens_avaliativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" UUID NOT NULL,
    "item_avaliativo_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "valor" DECIMAL(4,2),
    "lancado_por_id" UUID,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_calendario_academico" (
    "id" UUID NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "data" DATE NOT NULL,
    "data_fim" DATE,
    "horario" VARCHAR(30),
    "tipo" VARCHAR(30) NOT NULL,
    "publico" VARCHAR(150),
    "local" VARCHAR(150),
    "criado_em" TIMESTAMP,

    CONSTRAINT "eventos_calendario_academico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_academicos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "disciplina_id" UUID,
    "autor_id" UUID,
    "caminho" VARCHAR(255),
    "tamanho" BIGINT,
    "criado_em" TIMESTAMP,
    "atualizado_em" TIMESTAMP,

    CONSTRAINT "documentos_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(30),
    "titulo" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "descricao" TEXT,
    "turma_id" UUID NOT NULL,
    "professor_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    "peso" DECIMAL(4,3) NOT NULL DEFAULT 1,
    "nota_maxima" DECIMAL(4,2) NOT NULL DEFAULT 10,
    "abre_em" TIMESTAMP,
    "prazo_em" TIMESTAMP,
    "tempo_limite_min" INTEGER,
    "permite_atraso" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP,
    "publicado_em" TIMESTAMP,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL,
    "atividade_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "texto" TEXT,
    "enviado_em" TIMESTAMP,
    "nota" DECIMAL(4,2),
    "feedback" TEXT,
    "corrigido_por_id" UUID,
    "corrigido_em" TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_entrega" (
    "id" UUID NOT NULL,
    "entrega_id" UUID NOT NULL,
    "nome_arquivo" VARCHAR(255),
    "caminho" VARCHAR(255),
    "tipo" VARCHAR(80),
    "tamanho" BIGINT,
    "criado_em" TIMESTAMP,

    CONSTRAINT "anexos_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cursos_codigo_key" ON "cursos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_letivos_nome_key" ON "periodos_letivos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "disciplinas_codigo_key" ON "disciplinas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "professores_usuario_id_key" ON "professores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_usuario_id_key" ON "alunos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_ra_key" ON "alunos"("ra");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_codigo_periodo_letivo_id_key" ON "turmas"("codigo", "periodo_letivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_aluno_id_turma_id_key" ON "matriculas"("aluno_id", "turma_id");

-- CreateIndex
CREATE INDEX "registros_frequencia_aluno_id_idx" ON "registros_frequencia"("aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "registros_frequencia_turma_id_aluno_id_data_key" ON "registros_frequencia"("turma_id", "aluno_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "itens_avaliativos_atividade_id_key" ON "itens_avaliativos"("atividade_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_item_avaliativo_id_aluno_id_key" ON "notas"("item_avaliativo_id", "aluno_id");

-- CreateIndex
CREATE UNIQUE INDEX "atividades_codigo_key" ON "atividades"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_atividade_id_aluno_id_key" ON "entregas"("atividade_id", "aluno_id");

-- AddForeignKey
ALTER TABLE "disciplinas" ADD CONSTRAINT "disciplinas_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores" ADD CONSTRAINT "professores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_periodo_letivo_id_fkey" FOREIGN KEY ("periodo_letivo_id") REFERENCES "periodos_letivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_frequencia" ADD CONSTRAINT "registros_frequencia_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_frequencia" ADD CONSTRAINT "registros_frequencia_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_avaliativos" ADD CONSTRAINT "itens_avaliativos_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_avaliativos" ADD CONSTRAINT "itens_avaliativos_atividade_id_fkey" FOREIGN KEY ("atividade_id") REFERENCES "atividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_item_avaliativo_id_fkey" FOREIGN KEY ("item_avaliativo_id") REFERENCES "itens_avaliativos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_academicos" ADD CONSTRAINT "documentos_academicos_disciplina_id_fkey" FOREIGN KEY ("disciplina_id") REFERENCES "disciplinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_atividade_id_fkey" FOREIGN KEY ("atividade_id") REFERENCES "atividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_entrega" ADD CONSTRAINT "anexos_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
