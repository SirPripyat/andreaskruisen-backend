import { TournamentFormat } from '../../generated/prisma/client';

export interface ChampionMatch {
  homeTeamId: string;
  awayTeamId: string;
  goalScorerTeamIds: string[];
  // Vencedor nos pênaltis quando o placar empata — eliminatória não pode
  // terminar empatada (ver TournamentsService.replaceMatchGoals). Null
  // quando o placar não empatou (os pênaltis nem rolaram).
  penaltyWinnerTeamId: string | null;
}

export interface ChampionGroupStanding {
  teamId: string;
}

export type ChampionInput =
  | {
      format: TournamentFormat;
      isLatestPhaseFullyPlayed: boolean;
      latestPhaseType: 'KNOCKOUT';
      // Todas as partidas da fase (não só a final) — o chamador não precisa
      // saber de antemão se já é a final: 1 partida = final.
      knockoutMatches: ChampionMatch[];
    }
  | {
      format: TournamentFormat;
      isLatestPhaseFullyPlayed: boolean;
      latestPhaseType: 'GROUP';
      // Classificação de cada grupo, já ordenada (índice 0 = líder).
      standingsByGroup: Record<string, ChampionGroupStanding[]>;
    };

function computeMatchScore(match: ChampionMatch): {
  homeGoals: number;
  awayGoals: number;
} {
  let homeGoals = 0;
  let awayGoals = 0;
  for (const teamId of match.goalScorerTeamIds) {
    if (teamId === match.homeTeamId) {
      homeGoals++;
    } else if (teamId === match.awayTeamId) {
      awayGoals++;
    }
  }
  return { homeGoals, awayGoals };
}

// Campeão de um torneio já finalizado, ou null se ele ainda está em
// andamento ou não tem como ter um campeão único:
// - KNOCKOUT (ou a reta final de um GROUP_STAGE_KNOCKOUT): só quando a fase
//   atual já chegou numa única partida (a final) e ela tem resultado.
// - LEAGUE: o líder da tabela — sempre um grupo só (ver generateLeagueMatches
//   e TEAM_COUNT_RULES), já que mais de um grupo sem mata-mata não teria
//   confronto entre os líderes pra decidir o título.
// - GROUP_STAGE_KNOCKOUT ainda na fase de grupos nunca tem campeão: o
//   mata-mata decisório ainda nem foi gerado.
export function determineChampionTeamId(input: ChampionInput): string | null {
  if (!input.isLatestPhaseFullyPlayed) {
    return null;
  }

  if (input.latestPhaseType === 'KNOCKOUT') {
    if (input.knockoutMatches.length !== 1) {
      return null;
    }
    const final = input.knockoutMatches[0];
    const score = computeMatchScore(final);
    if (score.homeGoals === score.awayGoals) {
      return final.penaltyWinnerTeamId;
    }
    return score.homeGoals > score.awayGoals
      ? final.homeTeamId
      : final.awayTeamId;
  }

  if (input.format !== 'LEAGUE') {
    return null;
  }

  const groups = Object.values(input.standingsByGroup);
  if (groups.length !== 1 || groups[0].length === 0) {
    return null;
  }
  return groups[0][0].teamId;
}
