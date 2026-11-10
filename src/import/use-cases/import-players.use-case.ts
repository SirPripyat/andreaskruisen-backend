import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { LeaguesRepository } from '../../leagues/leagues.repository';
import { NationalitiesRepository } from '../../nationalities/nationalities.repository';
import { PlayersRepository } from '../../players/players.repository';
import { PlayerImportSnapshot } from '../../players/types';
import { TeamsRepository } from '../../teams/teams.repository';
import { IMPORT_BATCH_SIZE, NATIONAL_TEAMS_LEAGUE } from '../constants';
import { ScraperPlayer, ScraperPlayerSchema } from '../dto';
import { DimensionNotResolvedError, PlayerImportDataError } from '../errors';
import {
  PlayerImportFailure,
  PlayerImportSummary,
  PreparedPlayer,
  TeamDimension,
} from '../types';
import {
  arePositionsEqual,
  buildEaPlayerPhotoUrl,
  mapOverall,
  mapPositions,
  mapPreferredFoot,
  overallsEqual,
  parseBirthdate,
  parseJsonBuffer,
  processInBatches,
} from '../utils';

const teamKey = (team: string, league: string): string =>
  JSON.stringify([team, league]);

@Injectable()
export class ImportPlayersUseCase {
  private readonly logger = new Logger(ImportPlayersUseCase.name);

  constructor(
    private readonly playersRepository: PlayersRepository,
    private readonly teamsRepository: TeamsRepository,
    private readonly leaguesRepository: LeaguesRepository,
    private readonly nationalitiesRepository: NationalitiesRepository,
  ) {}

  async execute(
    fileBuffer: Buffer,
    capturedAt: Date,
  ): Promise<PlayerImportSummary> {
    const { players, invalidItems } = this.parsePlayers(fileBuffer);
    const summary = await this.importPlayers(players, capturedAt);

    return { ...summary, failed: [...invalidItems, ...summary.failed] };
  }

  private parsePlayers(fileBuffer: Buffer): {
    players: ScraperPlayer[];
    invalidItems: PlayerImportFailure[];
  } {
    const rawItems = parseJsonBuffer(
      fileBuffer,
      z.array(z.unknown()),
      'jogadores',
    );

    const players: ScraperPlayer[] = [];
    const invalidItems: PlayerImportFailure[] = [];

    rawItems.forEach((item, index) => {
      const parsed = ScraperPlayerSchema.safeParse(item);
      if (parsed.success) {
        players.push(parsed.data);
        return;
      }

      const raw =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : undefined;
      const eaId = typeof raw?.id === 'number' ? raw.id : undefined;
      const name =
        typeof raw?.name === 'string' ? raw.name : `item no índice ${index}`;
      const reason = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      this.logger.warn(`Jogador inválido no JSON (índice ${index}): ${reason}`);
      invalidItems.push({ eaId, name, reason });
    });

    return { players, invalidItems };
  }

  private async importPlayers(
    players: ScraperPlayer[],
    capturedAt: Date,
  ): Promise<PlayerImportSummary> {
    const startedAt = Date.now();
    const clubPlayers = players.filter(
      (player) => player.league !== NATIONAL_TEAMS_LEAGUE,
    );
    const skipped = players.length - clubPlayers.length;

    const { nationalityIdByName, teamIdByNameAndLeague } =
      await this.upsertDimensions(clubPlayers);
    const snapshotsByEaId =
      await this.playersRepository.findImportSnapshotsByEaIds(
        clubPlayers.map((player) => player.id),
      );

    let processed = 0;
    let ratingsInserted = 0;
    const failed: PlayerImportFailure[] = [];

    await processInBatches(clubPlayers, IMPORT_BATCH_SIZE, async (player) => {
      try {
        const prepared = this.preparePlayer(
          player,
          nationalityIdByName,
          teamIdByNameAndLeague,
        );
        const result = await this.persistPlayer(
          prepared,
          capturedAt,
          snapshotsByEaId.get(player.id),
        );

        if (result.ratingInserted) ratingsInserted++;
        processed++;
      } catch (error) {
        if (error instanceof PlayerImportDataError) {
          this.logger.warn(
            `Falha ao importar jogador eaId=${player.id} (${player.name}): ${error.message}`,
          );
          failed.push({
            eaId: player.id,
            name: player.name,
            reason: error.message,
          });
          return;
        }

        this.logger.error(
          `Erro de infraestrutura importando jogador eaId=${player.id} (${player.name}): ${
            error instanceof Error ? error.message : 'erro desconhecido'
          }`,
        );
        throw error;
      }
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      `Import de jogadores concluído: processed=${processed}, ratingsInserted=${ratingsInserted}, skipped=${skipped}, failed=${failed.length}, durationMs=${durationMs}`,
    );

    return { processed, ratingsInserted, skipped, failed };
  }

  private async upsertDimensions(players: ScraperPlayer[]): Promise<{
    nationalityIdByName: Map<string, string>;
    teamIdByNameAndLeague: Map<string, string>;
  }> {
    const flagUrlByNationality = new Map<string, string>();
    const leagueNames = new Set<string>();
    const teamByNameAndLeague = new Map<string, TeamDimension>();

    for (const player of players) {
      flagUrlByNationality.set(player.nationality, player.nationalityFlagUrl);
      leagueNames.add(player.league);
      const key = teamKey(player.team, player.league);
      teamByNameAndLeague.set(key, {
        name: player.team,
        league: player.league,
        crestUrl: player.teamCrestUrl,
      });
    }

    const [nationalityIdByName, leagueIdByName] = await Promise.all([
      this.resolveNationalities(flagUrlByNationality),
      this.resolveLeagues(leagueNames),
    ]);
    const teamIdByNameAndLeague = await this.resolveTeams(
      teamByNameAndLeague,
      leagueIdByName,
    );

    return { nationalityIdByName, teamIdByNameAndLeague };
  }

  private async resolveNationalities(
    flagUrlByNationality: Map<string, string>,
  ): Promise<Map<string, string>> {
    const nationalityIdByName = new Map<string, string>();

    await processInBatches(
      Array.from(flagUrlByNationality),
      IMPORT_BATCH_SIZE,
      async ([name, flagUrl]) => {
        const nationality = await this.nationalitiesRepository.upsertByName(
          name,
          flagUrl,
        );
        nationalityIdByName.set(name, nationality.id);
      },
    );

    return nationalityIdByName;
  }

  private async resolveLeagues(
    leagueNames: Set<string>,
  ): Promise<Map<string, string>> {
    const leagueIdByName = new Map<string, string>();

    await processInBatches(
      Array.from(leagueNames),
      IMPORT_BATCH_SIZE,
      async (name) => {
        const league = await this.leaguesRepository.upsertByName(name);
        leagueIdByName.set(name, league.id);
      },
    );

    return leagueIdByName;
  }

  private async resolveTeams(
    teamByNameAndLeague: Map<string, TeamDimension>,
    leagueIdByName: Map<string, string>,
  ): Promise<Map<string, string>> {
    const teamIdByNameAndLeague = new Map<string, string>();

    await processInBatches(
      Array.from(teamByNameAndLeague),
      IMPORT_BATCH_SIZE,
      async ([key, { name, league, crestUrl }]) => {
        const leagueId = leagueIdByName.get(league);
        if (leagueId === undefined) {
          throw new Error(
            `Liga "${league}" não resolvida para o time "${name}"`,
          );
        }
        const team = await this.teamsRepository.upsertByNameAndLeague({
          name,
          leagueId,
          crestUrl,
        });
        teamIdByNameAndLeague.set(key, team.id);
      },
    );

    return teamIdByNameAndLeague;
  }

  private preparePlayer(
    player: ScraperPlayer,
    nationalityIdByName: Map<string, string>,
    teamIdByNameAndLeague: Map<string, string>,
  ): PreparedPlayer {
    const nationalityId = nationalityIdByName.get(player.nationality);
    const teamId = teamIdByNameAndLeague.get(
      teamKey(player.team, player.league),
    );
    if (nationalityId === undefined || teamId === undefined) {
      throw new DimensionNotResolvedError(
        `Dimensões não resolvidas para o jogador ${player.name} (eaId ${player.id})`,
      );
    }

    try {
      return {
        upsertData: {
          eaId: player.id,
          name: player.name,
          photoUrl: buildEaPlayerPhotoUrl(player.id),
          birthdate: parseBirthdate(player.birthdate),
          preferredFoot: mapPreferredFoot(player.preferredFoot),
          nationalityId,
          teamId,
          latestOverallRating: player.overallRating,
        },
        positions: mapPositions(player),
        rating: mapOverall(player),
      };
    } catch (error) {
      if (error instanceof PlayerImportDataError) throw error;
      throw new PlayerImportDataError(
        `Falha ao mapear dados do jogador ${player.name} (eaId ${player.id}): ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
    }
  }

  private async persistPlayer(
    prepared: PreparedPlayer,
    capturedAt: Date,
    existing: PlayerImportSnapshot | undefined,
  ): Promise<{ ratingInserted: boolean }> {
    const dbPlayer = await this.playersRepository.upsertByEaId(
      prepared.upsertData,
    );

    if (!arePositionsEqual(existing?.positions ?? [], prepared.positions)) {
      await this.playersRepository.replacePositions(
        dbPlayer.id,
        prepared.positions,
      );
    }

    if (
      existing?.latestRating &&
      overallsEqual(existing.latestRating, prepared.rating)
    ) {
      return { ratingInserted: false };
    }

    await this.playersRepository.createRating(dbPlayer.id, {
      capturedAt,
      ...prepared.rating,
    });

    return { ratingInserted: true };
  }
}
