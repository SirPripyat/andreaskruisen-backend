-- DropIndex
DROP INDEX "Notification_userId_readAt_idx";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "seasonId" UUID;

-- Backfill: cada tipo de notificação referencia uma entidade diferente em
-- `metadata` (ver comentário do model Notification); usa essa referência
-- pra descobrir a season de cada notificação já existente.
UPDATE "Notification" n
SET "seasonId" = t."seasonId"
FROM "Transfer" t
WHERE n.type = 'TRANSFER_COMPLETED'
  AND t.id = (n.metadata->>'transferId')::uuid;

UPDATE "Notification" n
SET "seasonId" = s."seasonId"
FROM "Squad" s
WHERE n.type = 'TOURNAMENT_PRIZE_AWARDED'
  AND s.id = (n.metadata->>'squadId')::uuid;

UPDATE "Notification" n
SET "seasonId" = dn."seasonId"
FROM "DirectNegotiation" dn
WHERE n.type IN ('NEGOTIATION_PROPOSED', 'NEGOTIATION_ACCEPTED', 'NEGOTIATION_REJECTED')
  AND dn.id = (n.metadata->>'negotiationId')::uuid;

UPDATE "Notification" n
SET "seasonId" = (n.metadata->>'seasonId')::uuid
WHERE n.type = 'AUDIT_DISCREPANCY_FOUND';

-- Notificação órfã (entidade de origem já não existe mais) não tem como
-- recuperar a season: não há informação suficiente pra mantê-la isolada
-- corretamente, então é descartada.
DELETE FROM "Notification" WHERE "seasonId" IS NULL;

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "seasonId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_seasonId_userId_readAt_idx" ON "Notification"("seasonId", "userId", "readAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
