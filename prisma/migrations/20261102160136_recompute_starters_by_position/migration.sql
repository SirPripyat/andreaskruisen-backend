-- Migration de dados (sem mudança de schema): recalcula
-- PlayerTeamAssignment.isStarter com a regra nova — titular de uma posição
-- é o melhor overall do elenco atual do time NESSA posição, até o número de
-- slots que o time tem na formação real (TeamLineupSlot). A migration
-- anterior (20261102154128) ainda usava a regra antiga (slot troca de dono
-- entre os dois jogadores da troca, sem olhar overall/posição); esta
-- substitui esse resultado pelo valor correto, de uma vez, pra toda
-- temporada/time/posição — não depende de ordem/replay do ledger de
-- trocas, porque só depende do elenco ATUAL (já correto).
WITH slot_counts AS (
  SELECT "teamId", "position", COUNT(*)::int AS required
  FROM "TeamLineupSlot"
  GROUP BY "teamId", "position"
),
ranked AS (
  SELECT
    pta.id AS assignment_id,
    ROW_NUMBER() OVER (
      PARTITION BY pta."seasonId", pta."teamId", pp."position"
      ORDER BY p."latestOverallRating" DESC, p.id
    ) AS rnk,
    COALESCE(sc.required, 0) AS required
  FROM "PlayerTeamAssignment" pta
  JOIN "Player" p ON p.id = pta."playerId"
  JOIN "PlayerPosition" pp ON pp."playerId" = p.id AND pp."isPrimary" = true
  LEFT JOIN slot_counts sc
    ON sc."teamId" = pta."teamId" AND sc."position" = pp."position"
)
UPDATE "PlayerTeamAssignment" pta
SET "isStarter" = (ranked.rnk <= ranked.required)
FROM ranked
WHERE pta.id = ranked.assignment_id;
