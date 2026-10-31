import {
  PositionCodeSchema,
  ScraperPlayerSchema,
  ScraperStatsSchema,
} from './scraper-player.schema';

const MINIMAL_STATS = {
  acceleration: 67,
  agility: 78,
  jumping: 70,
  stamina: 83,
  strength: 71,
  aggression: 44,
  balance: 82,
  ballControl: 86,
  composure: 85,
  crossing: 78,
  curve: 82,
  defensiveAwareness: 49,
  dribbling: 84,
  finishing: 76,
  freeKickAccuracy: 78,
  gkDiving: 11,
  gkHandling: 16,
  gkKicking: 11,
  gkPositioning: 8,
  gkReflexes: 9,
  headingAccuracy: 57,
  interceptions: 54,
  longPassing: 83,
  longShots: 76,
  penalties: 55,
  positioning: 82,
  reactions: 82,
  shortPassing: 85,
  shotPower: 82,
  slidingTackle: 39,
  sprintSpeed: 71,
  standingTackle: 32,
  vision: 86,
  volleys: 85,
};

function buildRawPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 212194,
    name: 'Julian Brandt',
    photoUrl: 'https://example.com/photo.png',
    team: 'Ajax',
    teamCrestUrl: 'https://example.com/crest.png',
    nationality: 'Alemanha',
    nationalityFlagUrl: 'https://example.com/flag.png',
    league: 'Eredivisie',
    birthdate: '1996-05-02',
    preferredFoot: 'Destro',
    skillMoves: 4,
    weakFootAbility: 4,
    overallRating: 82,
    positionShort: 'MEI',
    alternatePositions: ['MC', 'VOL'],
    stats: MINIMAL_STATS,
    ...overrides,
  };
}

describe('ScraperStatsSchema', () => {
  it('parses stats using pt-BR labels, without the pac/sho/pas/dri/def/phy aggregates', () => {
    const result = ScraperStatsSchema.parse({
      Cruzamento: 58,
      Finalização: 96,
      'Precisão no Cabeceio': 85,
      'Passe curto': 78,
      Voleios: 90,
      Dribles: 79,
      Curva: 77,
      'Precisão nas faltas': 62,
      Lançamento: 66,
      'Controle de bola': 83,
      Aceleração: 81,
      Pique: 92,
      Agilidade: 66,
      Reação: 94,
      Equilíbrio: 69,
      'Força do chute': 94,
      Impulsão: 93,
      Fôlego: 80,
      Força: 93,
      'Chutes de longe': 83,
      Combatividade: 88,
      'Intercept.': 43,
      'Pos. ataque': 95,
      'Visão de jogo': 75,
      Pênaltis: 89,
      Compostura: 86,
      'Habilidade defensiva': 42,
      'Dividida em pé': 47,
      Carrinho: 33,
      'Elasticidade GL': 7,
      'Manejo GL': 14,
      'Chute GL': 13,
      'Posicion. GL': 11,
      'Reflexos GL': 7,
    });

    expect(result.finishing).toBe(96);
    expect(result.gkDiving).toBe(7);
    expect(result.pac).toBeUndefined();
    expect(result.sho).toBeUndefined();
  });

  it('still accepts the old English-keyed format including the aggregates', () => {
    const result = ScraperStatsSchema.parse({
      acceleration: 67,
      agility: 78,
      jumping: 70,
      stamina: 83,
      strength: 71,
      aggression: 44,
      balance: 82,
      ballControl: 86,
      composure: 85,
      crossing: 78,
      curve: 82,
      def: 45,
      defensiveAwareness: 49,
      dri: 84,
      dribbling: 84,
      finishing: 76,
      freeKickAccuracy: 78,
      gkDiving: 11,
      gkHandling: 16,
      gkKicking: 11,
      gkPositioning: 8,
      gkReflexes: 9,
      headingAccuracy: 57,
      interceptions: 54,
      longPassing: 83,
      longShots: 76,
      pac: 69,
      pas: 83,
      penalties: 55,
      phy: 69,
      positioning: 82,
      reactions: 82,
      sho: 77,
      shortPassing: 85,
      shotPower: 82,
      slidingTackle: 39,
      sprintSpeed: 71,
      standingTackle: 32,
      vision: 86,
      volleys: 85,
    });

    expect(result.pac).toBe(69);
  });
});

describe('PositionCodeSchema', () => {
  it('translates the new "GL" goalkeeper code to the canonical GOL', () => {
    expect(PositionCodeSchema.parse('GL')).toBe('GOL');
  });

  it('still accepts every other position code unchanged', () => {
    for (const code of [
      'GOL',
      'ZAG',
      'LD',
      'LE',
      'VOL',
      'MC',
      'MD',
      'ME',
      'MEI',
      'PD',
      'PE',
      'ATA',
    ]) {
      expect(PositionCodeSchema.parse(code)).toBe(code);
    }
  });
});

describe('ScraperPlayerSchema', () => {
  it('parses a normal player with their real team unchanged', () => {
    const result = ScraperPlayerSchema.parse(buildRawPlayer());
    expect(result.team).toBe('Ajax');
    expect(result.league).toBe('Eredivisie');
  });

  it('groups free agents (empty team/teamCrestUrl/league) under a shared placeholder team', () => {
    const result = ScraperPlayerSchema.parse(
      buildRawPlayer({ team: '', teamCrestUrl: '', league: '' }),
    );
    expect(result.team).toBe('Agente livre');
    expect(result.league).toBe('Sem liga');
    expect(result.teamCrestUrl).toBe(
      'https://andreaskruisen.internal/free-agent-crest.png',
    );
  });
});
