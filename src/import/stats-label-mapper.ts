// O scraper passou a exportar os atributos usando os rótulos de exibição do
// SoFIFA em pt-BR em vez das chaves em inglês. Este mapa traduz esses rótulos
// de volta para as chaves canônicas usadas em todo o domínio (ScraperStatsSchema,
// PlayerRating). Chaves que já vierem em inglês passam intactas, então o import
// continua aceitando o formato antigo.
const PT_BR_STAT_LABELS: Record<string, string> = {
  Cruzamento: 'crossing',
  Finalização: 'finishing',
  'Precisão no Cabeceio': 'headingAccuracy',
  'Passe curto': 'shortPassing',
  Voleios: 'volleys',
  Dribles: 'dribbling',
  Curva: 'curve',
  'Precisão nas faltas': 'freeKickAccuracy',
  Lançamento: 'longPassing',
  'Controle de bola': 'ballControl',
  Aceleração: 'acceleration',
  Pique: 'sprintSpeed',
  Agilidade: 'agility',
  Reação: 'reactions',
  Equilíbrio: 'balance',
  'Força do chute': 'shotPower',
  Impulsão: 'jumping',
  Fôlego: 'stamina',
  Força: 'strength',
  'Chutes de longe': 'longShots',
  Combatividade: 'aggression',
  'Intercept.': 'interceptions',
  'Pos. ataque': 'positioning',
  'Visão de jogo': 'vision',
  Pênaltis: 'penalties',
  Compostura: 'composure',
  'Habilidade defensiva': 'defensiveAwareness',
  'Dividida em pé': 'standingTackle',
  Carrinho: 'slidingTackle',
  'Elasticidade GL': 'gkDiving',
  'Manejo GL': 'gkHandling',
  'Chute GL': 'gkKicking',
  'Posicion. GL': 'gkPositioning',
  'Reflexos GL': 'gkReflexes',
};

export function normalizeStatsKeys(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const canonicalKey = PT_BR_STAT_LABELS[key] ?? key;
    normalized[canonicalKey] = value;
  }
  return normalized;
}
