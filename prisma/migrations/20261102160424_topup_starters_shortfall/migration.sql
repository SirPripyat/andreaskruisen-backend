-- Migration de dados (sem mudança de schema): completa o invariante de "N
-- titulares" por time (N = total de slots na formação real, TeamLineupSlot)
-- depois do recálculo por posição da migration anterior (20261102160136).
-- Esse recálculo isolado por posição pode deixar um time abaixo do total
-- exigido quando o elenco atual não tem jogador suficiente cuja posição
-- PRINCIPAL bata exatamente com algum slot — promove, por time, os
-- melhores reservas por overall (de qualquer posição) até fechar a conta,
-- mesma lógica de fallback já usada na importação da escalação real ("o
-- slot é preenchido pelo melhor jogador que sobrar de outra posição").
WITH required_totals AS (
  SELECT "teamId", COUNT(*)::int AS required
  FROM "TeamLineupSlot"
  GROUP BY "teamId"
),
current_totals AS (
  SELECT "seasonId", "teamId", COUNT(*) FILTER (WHERE "isStarter")::int AS current
  FROM "PlayerTeamAssignment"
  GROUP BY "seasonId", "teamId"
),
shortfalls AS (
  SELECT ct."seasonId", ct."teamId", (rt.required - ct.current) AS shortfall
  FROM current_totals ct
  JOIN required_totals rt ON rt."teamId" = ct."teamId"
  WHERE rt.required > ct.current
),
ranked_bench AS (
  SELECT
    pta.id AS assignment_id,
    s.shortfall,
    ROW_NUMBER() OVER (
      PARTITION BY pta."seasonId", pta."teamId"
      ORDER BY p."latestOverallRating" DESC, p.id
    ) AS rnk
  FROM "PlayerTeamAssignment" pta
  JOIN shortfalls s ON s."seasonId" = pta."seasonId" AND s."teamId" = pta."teamId"
  JOIN "Player" p ON p.id = pta."playerId"
  WHERE pta."isStarter" = false
)
UPDATE "PlayerTeamAssignment" pta
SET "isStarter" = true
FROM ranked_bench
WHERE pta.id = ranked_bench.assignment_id
  AND ranked_bench.rnk <= ranked_bench.shortfall;
