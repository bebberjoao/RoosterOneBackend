-- AlterTable
ALTER TABLE "disciplinas" ALTER COLUMN "curso_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "turmas" ALTER COLUMN "disciplina_id" DROP NOT NULL;
