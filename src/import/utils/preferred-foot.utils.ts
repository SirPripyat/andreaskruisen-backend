import { PreferredFoot } from '../../../generated/prisma/enums';
import { ScraperPlayer } from '../dto';

export const mapPreferredFoot = (
  raw: ScraperPlayer['preferredFoot'],
): PreferredFoot =>
  raw === 'Destro' ? PreferredFoot.RIGHT : PreferredFoot.LEFT;
