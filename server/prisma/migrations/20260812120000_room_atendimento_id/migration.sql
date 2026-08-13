-- AlterTable: amarra a sala ao atendimento da API principal.
-- Nullable para não quebrar as salas já existentes no banco de desenvolvimento.
ALTER TABLE "Room" ADD COLUMN "atendimentoId" TEXT;

-- CreateIndex: garante que um atendimento nunca tenha duas salas.
CREATE UNIQUE INDEX "Room_atendimentoId_key" ON "Room"("atendimentoId");
