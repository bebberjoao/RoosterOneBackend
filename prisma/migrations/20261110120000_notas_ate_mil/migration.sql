-- Notas e notas máximas passam de DECIMAL(4,2), que comporta até 99,99, para DECIMAL(6,2): uma avaliação valendo
-- 100 pontos provocava estouro numérico (erro interno) ao ser gravada. Não há perda de dados: a escala é mantida.
ALTER TABLE "itens_avaliativos" ALTER COLUMN "nota_maxima" SET DATA TYPE DECIMAL(6,2);
ALTER TABLE "notas" ALTER COLUMN "valor" SET DATA TYPE DECIMAL(6,2);
ALTER TABLE "atividades" ALTER COLUMN "nota_maxima" SET DATA TYPE DECIMAL(6,2);
ALTER TABLE "entregas" ALTER COLUMN "nota" SET DATA TYPE DECIMAL(6,2);
