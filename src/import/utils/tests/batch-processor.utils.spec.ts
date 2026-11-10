import { processInBatches } from '../batch-processor.utils';

describe('processInBatches', () => {
  it('processa todos os itens', async () => {
    const processed: number[] = [];

    await processInBatches([1, 2, 3, 4, 5], 2, async (item) => {
      processed.push(item);
    });

    expect(processed.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('não chama fn quando a lista está vazia', async () => {
    const fn = jest.fn();

    await processInBatches([], 2, fn);

    expect(fn).not.toHaveBeenCalled();
  });

  it('processa um lote inteiro em paralelo antes de seguir pro próximo', async () => {
    const order: string[] = [];

    await processInBatches([1, 2, 3, 4], 2, async (item) => {
      order.push(`start-${item}`);
      await Promise.resolve();
      order.push(`end-${item}`);
    });

    expect(order).toEqual([
      'start-1',
      'start-2',
      'end-1',
      'end-2',
      'start-3',
      'start-4',
      'end-3',
      'end-4',
    ]);
  });

  it('propaga o erro de um item sem processar os lotes seguintes', async () => {
    const processed: number[] = [];

    await expect(
      processInBatches([1, 2, 3, 4], 2, async (item) => {
        if (item === 2) throw new Error('falhou');
        processed.push(item);
      }),
    ).rejects.toThrow('falhou');

    expect(processed).not.toContain(3);
    expect(processed).not.toContain(4);
  });
});
