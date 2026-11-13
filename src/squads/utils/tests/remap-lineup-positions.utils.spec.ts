import { PositionCode } from '../../../../generated/prisma/client';
import { remapLineupPositions } from '../remap-lineup-positions.utils';

const slot = (playerId: string, position: PositionCode) => ({
  playerId,
  position,
});

describe('remapLineupPositions', () => {
  it('mantém o titular na mesma posição quando ela existe no novo layout', () => {
    const starters = [slot('p1', 'GOL'), slot('p2', 'ATA')];
    const template: PositionCode[] = ['GOL', 'ATA'];

    const result = remapLineupPositions(starters, template);

    expect(result).toEqual(
      expect.arrayContaining([slot('p1', 'GOL'), slot('p2', 'ATA')]),
    );
  });

  it('redistribui quem perdeu a posição pelos slots que restarem', () => {
    // ZAG titular troca pra uma formação sem ZAG (ex.: 3 pro 4 na linha
    // defensiva) — ele precisa herdar algum slot que sobrou, não desaparecer.
    const starters = [slot('p1', 'GOL'), slot('p2', 'ZAG'), slot('p3', 'MC')];
    const template: PositionCode[] = ['GOL', 'MC', 'ATA'];

    const result = remapLineupPositions(starters, template);

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([slot('p1', 'GOL'), slot('p3', 'MC')]),
    );
    expect(result.find((r) => r.playerId === 'p2')?.position).toBe('ATA');
  });

  it('troca de jogador na mesma posição: a posição do slot não muda', () => {
    // Regra 2: se o ZAG titular sai e um MC do banco entra naquele slot, o
    // slot continua MC — é essa troca que o caller (SwapLineupStarterUseCase)
    // monta antes de chamar o remap; aqui só garantimos que o remap em si
    // preserva a posição de quem já a tinha.
    const starters = [slot('mc-player', 'MC')];
    const template: PositionCode[] = ['MC'];

    const result = remapLineupPositions(starters, template);

    expect(result).toEqual([slot('mc-player', 'MC')]);
  });

  it('quando ninguém bate com o novo layout, distribui todo mundo em ordem GOL→ATA', () => {
    const starters = [slot('p1', 'ATA'), slot('p2', 'GOL')];
    const template: PositionCode[] = ['VOL', 'MEI'];

    const result = remapLineupPositions(starters, template);

    expect(result).toHaveLength(2);
    expect(new Set(result.map((r) => r.position))).toEqual(
      new Set(['VOL', 'MEI']),
    );
  });
});
