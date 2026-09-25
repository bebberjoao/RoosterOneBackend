-- AlterTable
ALTER TABLE "aulas_boost" ADD COLUMN     "video_arquivo" VARCHAR(255),
ADD COLUMN     "video_mime_type" VARCHAR(80),
ADD COLUMN     "video_tamanho" BIGINT;

-- AlterTable
ALTER TABLE "progresso_aulas_boost" ADD COLUMN     "percentual_assistido" INTEGER DEFAULT 0,
ADD COLUMN     "posicao_seg" INTEGER DEFAULT 0;
