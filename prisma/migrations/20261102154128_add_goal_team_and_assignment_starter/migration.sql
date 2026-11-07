-- AlterTable
-- teamId começa nullable pra poder ser preenchido (ver backfill abaixo)
-- antes de virar NOT NULL.
ALTER TABLE "Goal" ADD COLUMN     "teamId" UUID;

-- AlterTable
ALTER TABLE "PlayerTeamAssignment" ADD COLUMN     "isStarter" BOOLEAN NOT NULL DEFAULT false;

-- Backfill de Goal.teamId: antes dessa coluna existir, o time de cada gol
-- era sempre derivado do Player.teamId (real/estático) do artilheiro — ver
-- comentário antigo no model Goal. Reconstrói exatamente esse valor pros
-- gols já registrados, pra não mudar nenhum placar já exibido.
UPDATE "Goal" g
SET "teamId" = p."teamId"
FROM "Player" p
WHERE g."scorerId" = p.id;

ALTER TABLE "Goal" ALTER COLUMN "teamId" SET NOT NULL;

-- Backfill de PlayerTeamAssignment.isStarter: começa como o status real
-- (SoFIFA) de cada jogador, como se nenhuma troca tivesse ocorrido ainda.
UPDATE "PlayerTeamAssignment" pta
SET "isStarter" = EXISTS (
  SELECT 1 FROM "TeamLineupSlot" ls WHERE ls."playerId" = pta."playerId"
);

-- Replay do ledger de trocas (Transfer), em ordem cronológica, pra que o
-- slot (titular/banco) acompanhe quem entrou/saiu em cada troca já
-- registrada — sem isso, temporadas que já tiveram trocas antes dessa
-- coluna existir ficariam com a contagem de titulares errada (o bug
-- original: um elenco acumulando titulares emprestados de outro time).
DO $$
DECLARE
  t RECORD;
  outgoing_is_starter BOOLEAN;
  incoming_is_starter BOOLEAN;
BEGIN
  FOR t IN
    SELECT "seasonId", "outgoingPlayerId", "incomingPlayerId"
    FROM "Transfer"
    ORDER BY "createdAt" ASC
  LOOP
    SELECT "isStarter" INTO outgoing_is_starter
    FROM "PlayerTeamAssignment"
    WHERE "seasonId" = t."seasonId" AND "playerId" = t."outgoingPlayerId";

    SELECT "isStarter" INTO incoming_is_starter
    FROM "PlayerTeamAssignment"
    WHERE "seasonId" = t."seasonId" AND "playerId" = t."incomingPlayerId";

    UPDATE "PlayerTeamAssignment"
    SET "isStarter" = incoming_is_starter
    WHERE "seasonId" = t."seasonId" AND "playerId" = t."outgoingPlayerId";

    UPDATE "PlayerTeamAssignment"
    SET "isStarter" = outgoing_is_starter
    WHERE "seasonId" = t."seasonId" AND "playerId" = t."incomingPlayerId";
  END LOOP;
END $$;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
