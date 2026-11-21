export type SimulateMatchesBulkResponseDTO = {
  tournamentId: string;
  simulatedMatchIds: string[];
  skipped: { matchId: string; reason: string }[];
};
