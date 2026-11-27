-- Torneios GROUP_STAGE_KNOCKOUT criados antes de groupStageConfig existir
-- (ver 20261127013940_add_tournament_group_stage_config) ficaram com a
-- coluna NULL. readQualifiersPerGroup/AdvancePhaseUseCase chamam
-- GroupStageConfigSchema.parse(tournament.groupStageConfig) sem checar
-- null, então GET /tournaments (e avançar fase) quebravam com 500 pra
-- esses torneios antigos.
--
-- Backfill com os valores que eram hardcoded antes da config existir
-- (ver histórico de group-stage-tournament.utils.ts e
-- advance-phase.use-case.ts): grupos de 4, top-2 de cada grupo avança,
-- turno único. keepOwnedTeamsInSameGroup não tem equivalente no código
-- antigo (grupos eram só um slice sequencial dos times) — true é o mais
-- próximo disso e não afeta mais o sorteio desses torneios, já que os
-- grupos já foram sorteados e as partidas já existem.
UPDATE "Tournament"
SET "groupStageConfig" = '{"groupSize":4,"qualifiersPerGroup":2,"doubleRound":false,"keepOwnedTeamsInSameGroup":true}'::jsonb
WHERE "format" = 'GROUP_STAGE_KNOCKOUT' AND "groupStageConfig" IS NULL;
