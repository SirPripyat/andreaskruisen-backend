import { Injectable } from '@nestjs/common';
import { BRASILEIRAO_LEAGUE } from '../constants';
import { ScraperPlayer } from '../dto';
import { ImportPlayersUseCase } from './import-players.use-case';

// Fonte exclusiva dos jogadores do Brasileirão (ver BRASILEIRAO_LEAGUE): o
// mod já traz a foto certa, então ela é usada como está em vez de ser
// reconstruída a partir do eaId (como no import do SoFIFA).
@Injectable()
export class ImportFcmPlayersUseCase extends ImportPlayersUseCase {
  protected isImportable(player: ScraperPlayer): boolean {
    return player.league === BRASILEIRAO_LEAGUE;
  }

  protected resolvePhotoUrl(player: ScraperPlayer): string {
    return player.photoUrl;
  }
}
