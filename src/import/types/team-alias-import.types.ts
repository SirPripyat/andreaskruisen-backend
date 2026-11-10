export type TeamAliasImportSummary = {
  processed: number;
  created: number;
  // Entradas sem resolved_team_name preenchido: nada a fazer, não é erro.
  skipped: number;
  // resolved_team_name preenchido mas sem Team com esse nome exato.
  teamNotFound: string[];
  // resolved_team_name bate com mais de um Team (nome repetido entre
  // países) — precisa do nome completo ou de resolver na mão.
  ambiguous: string[];
  invalid: string[];
};
