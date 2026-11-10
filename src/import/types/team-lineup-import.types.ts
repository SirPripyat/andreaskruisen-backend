export type TeamLineupImportSummary = {
  processed: number;
  updated: number;
  // Nenhum titular do JSON bateu com Player.eaId: time provavelmente ainda
  // não teve o elenco importado (ver notFound em ImportTeamFormationsUseCase).
  notFound: string[];
  // Titulares do JSON cujo eaId não existe em nenhum Player (scraper de
  // jogadores desatualizado ou dessincronizado com o de escalações).
  playersNotFound: number;
  // Titulares batidos por eaId, mas cujo Player.teamId atual é diferente do
  // time majoritário resolvido pra essa entrada — provável transferência
  // entre os snapshots dos dois scrapers. Não entram na escalação salva.
  staleTeamSlots: number;
  invalid: string[];
};
