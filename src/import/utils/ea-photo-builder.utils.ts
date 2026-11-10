const GAME_VERSION = 'FC27';

export const buildEaPlayerPhotoUrl = (eaId: number): string =>
  `https://ratings-images-prod.pulse.ea.com/${GAME_VERSION}/components/players/p${eaId}.webp`;
