import { NotFoundException } from '@nestjs/common';
import { Squad } from '../../../../generated/prisma/client';
import { SquadsRepository } from '../../squads.repository';
import { ListSquadCoinTransactionsUseCase } from '../list-squad-coin-transactions.use-case';

const buildUseCase = (overrides: { squad: Squad | null }) => {
  const squadsRepository = {
    findByTeamAndSeason: jest.fn().mockResolvedValue(overrides.squad),
    findCoinTransactions: jest.fn().mockResolvedValue([]),
  } as unknown as SquadsRepository;

  const useCase = new ListSquadCoinTransactionsUseCase(squadsRepository);

  return { useCase, squadsRepository };
};

describe('ListSquadCoinTransactionsUseCase', () => {
  it('retorna o extrato de moedas do squad do time na temporada', async () => {
    const squad = { id: 'squad-1' } as Squad;
    const { useCase, squadsRepository } = buildUseCase({ squad });

    await useCase.execute('season-1', 'team-1');

    expect(squadsRepository.findByTeamAndSeason).toHaveBeenCalledWith(
      'team-1',
      'season-1',
    );
    expect(squadsRepository.findCoinTransactions).toHaveBeenCalledWith(
      'squad-1',
      'team-1',
    );
  });

  it('rejeita quando o time não tem elenco nessa temporada', async () => {
    const { useCase, squadsRepository } = buildUseCase({ squad: null });

    await expect(useCase.execute('season-1', 'team-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(squadsRepository.findCoinTransactions).not.toHaveBeenCalled();
  });
});
