-- pg_dump reseta search_path para vazio antes de restaurar (boa prática de
-- segurança: evita sequestro de função via search_path malicioso). O corpo
-- de immutable_unaccent chamava unaccent('unaccent', $1) sem qualificar
-- schema nem na função nem no nome do dicionário de text search, então um
-- restore de dump gerado por pg_dump quebrava em cascata logo na criação
-- das tabelas ("function unaccent(unknown, text) does not exist" e, depois
-- de qualificar só a função, "text search dictionary unaccent does not
-- exist" — o literal 'unaccent' também precisa do schema pra resolver pra
-- regdictionary sem depender do search_path da sessão que roda o restore).
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$;
