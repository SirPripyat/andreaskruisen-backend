-- unaccent() do Postgres é STABLE (depende do dicionário de text search
-- configurado), não IMMUTABLE — e colunas geradas exigem uma expressão
-- IMMUTABLE. O wrapper abaixo é o jeito padrão de contornar isso: fixa o
-- dicionário 'unaccent' explicitamente, então o resultado passa a ser
-- determinístico pra uma mesma entrada (seguro marcar IMMUTABLE).
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT unaccent('unaccent', $1)
$$;

-- AlterTable
-- Coluna gerada e mantida pelo Postgres a cada escrita em "name" — nunca
-- setada pela aplicação. Buscas por nome devem comparar contra ela (já
-- normalizada: minúsculas e sem acento) em vez de "name" diretamente.
ALTER TABLE "League" ADD COLUMN "nameSearch" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;

-- AlterTable
ALTER TABLE "Nationality" ADD COLUMN "nameSearch" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "nameSearch" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "nameSearch" TEXT GENERATED ALWAYS AS (lower(immutable_unaccent(name))) STORED;
