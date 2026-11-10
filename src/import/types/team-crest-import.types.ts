export type TeamCrestImportSummary = {
  processed: number;
  updated: number;
  // A base hoje só tem times masculinos (ver comentário em Team.crestUrl no
  // schema); entradas femininas do catálogo são puladas em vez de
  // rejeitadas, já que o nome pode colidir com o time masculino homônimo
  // (ex.: "Manchester Utd" feminino x "Manchester United" masculino).
  skippedFeminino: number;
  // Nomes do JSON que não bateram com nenhum Team por nome (nem por
  // TeamAlias) — time ainda não importado via players, ou nome
  // abreviado/diferente entre os dois catálogos da EA.
  notFound: string[];
  // Nomes do JSON que bateram com mais de um Team (nome repetido entre
  // países, ex.: "Nacional") e cuja liga informada no JSON também não
  // desempatou pra exatamente um Team.
  ambiguous: string[];
  invalid: string[];
};
