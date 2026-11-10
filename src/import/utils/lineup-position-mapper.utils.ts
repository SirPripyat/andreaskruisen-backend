import { PositionCode } from '../../../generated/prisma/client';

// O JSON de escalações titulares do scraper detalha mais a posição do que o
// nosso PositionCode: quando a formação tem dois jogadores numa posição
// central (ex. dois zagueiros, dois volantes), o scraper distingue qual
// ficou mais pra direita/esquerda sufixando D/E (ZGD/ZGE, VD/VE, MCD/MCE,
// MED/MEE, ATD/ATE). Pro nosso domínio essa lateralidade não importa (só
// usamos a posição pra filtrar defesa/meio/ataque — ver teams.repository),
// então colapsamos os dois lados de volta pra posição central única.
export const LINEUP_POSITION_TO_ENUM: Record<string, PositionCode> = {
  GL: PositionCode.GOL,
  ZAG: PositionCode.ZAG,
  ZGD: PositionCode.ZAG,
  ZGE: PositionCode.ZAG,
  LD: PositionCode.LD,
  LE: PositionCode.LE,
  VOL: PositionCode.VOL,
  VD: PositionCode.VOL,
  VE: PositionCode.VOL,
  MC: PositionCode.MC,
  MCD: PositionCode.MC,
  MCE: PositionCode.MC,
  MD: PositionCode.MD,
  ME: PositionCode.ME,
  MEI: PositionCode.MEI,
  MED: PositionCode.MEI,
  MEE: PositionCode.MEI,
  PD: PositionCode.PD,
  PE: PositionCode.PE,
  ATA: PositionCode.ATA,
  ATD: PositionCode.ATA,
  ATE: PositionCode.ATA,
};
