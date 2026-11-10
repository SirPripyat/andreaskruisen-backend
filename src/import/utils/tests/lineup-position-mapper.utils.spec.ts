import { PositionCode } from '../../../../generated/prisma/client';
import { LINEUP_POSITION_TO_ENUM } from '../lineup-position-mapper.utils';

describe('lineup-position-mapper.utils', () => {
  it('mapeia os sufixos de lateralidade (D/E) pra posição central única', () => {
    expect(LINEUP_POSITION_TO_ENUM.ZGD).toBe(PositionCode.ZAG);
    expect(LINEUP_POSITION_TO_ENUM.ZGE).toBe(PositionCode.ZAG);
    expect(LINEUP_POSITION_TO_ENUM.VD).toBe(PositionCode.VOL);
    expect(LINEUP_POSITION_TO_ENUM.VE).toBe(PositionCode.VOL);
    expect(LINEUP_POSITION_TO_ENUM.MCD).toBe(PositionCode.MC);
    expect(LINEUP_POSITION_TO_ENUM.MCE).toBe(PositionCode.MC);
    expect(LINEUP_POSITION_TO_ENUM.MED).toBe(PositionCode.MEI);
    expect(LINEUP_POSITION_TO_ENUM.MEE).toBe(PositionCode.MEI);
    expect(LINEUP_POSITION_TO_ENUM.ATD).toBe(PositionCode.ATA);
    expect(LINEUP_POSITION_TO_ENUM.ATE).toBe(PositionCode.ATA);
  });

  it('mapeia as posições já diretas (sem sufixo) pra elas mesmas', () => {
    expect(LINEUP_POSITION_TO_ENUM.GL).toBe(PositionCode.GOL);
    expect(LINEUP_POSITION_TO_ENUM.LD).toBe(PositionCode.LD);
    expect(LINEUP_POSITION_TO_ENUM.LE).toBe(PositionCode.LE);
    expect(LINEUP_POSITION_TO_ENUM.MD).toBe(PositionCode.MD);
    expect(LINEUP_POSITION_TO_ENUM.ME).toBe(PositionCode.ME);
    expect(LINEUP_POSITION_TO_ENUM.PD).toBe(PositionCode.PD);
    expect(LINEUP_POSITION_TO_ENUM.PE).toBe(PositionCode.PE);
  });

  it('todo valor mapeado é um PositionCode válido', () => {
    const validCodes = new Set(Object.values(PositionCode));
    for (const mapped of Object.values(LINEUP_POSITION_TO_ENUM)) {
      expect(validCodes.has(mapped)).toBe(true);
    }
  });
});
