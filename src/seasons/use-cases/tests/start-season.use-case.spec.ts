import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, Season } from '../../../../generated/prisma/client';
import { SeasonsRepository } from '../../seasons.repository';
import { StartSeasonUseCase } from '../start-season.use-case';
import { StartSeasonEconomyUseCase } from '../start-season-economy.use-case';

// @Transactional() exige um TransactionHost real — ver mesmo comentário em
// accept-negotiation.use-case.spec.ts.
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const buildPrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('mensagem de erro', {
    code,
    clientVersion: '7.10.1',
  });

const dto = {
  name: 'Teste',
  squads: [{ userId: 'user-1', teamId: 'team-1' }],
};

const buildUseCase = () => {
  const seasonsRepository = {
    create: jest.fn().mockResolvedValue({ id: 'season-1' } as Season),
    seedPlayerAssignmentsFromRealTeams: jest.fn().mockResolvedValue(0),
    createSquads: jest.fn().mockResolvedValue(undefined),
  } as unknown as SeasonsRepository;

  const startSeasonEconomyUseCase = {
    execute: jest.fn(),
  } as unknown as StartSeasonEconomyUseCase;

  const useCase = new StartSeasonUseCase(
    seasonsRepository,
    startSeasonEconomyUseCase,
  );

  return { useCase, seasonsRepository, startSeasonEconomyUseCase };
};

describe('StartSeasonUseCase', () => {
  it('rejeita com mensagem clara quando já existe uma temporada com esse nome', async () => {
    const { useCase, seasonsRepository, startSeasonEconomyUseCase } =
      buildUseCase();
    (seasonsRepository.create as jest.Mock).mockRejectedValue(
      buildPrismaError('P2002'),
    );

    await expect(useCase.execute(dto)).rejects.toThrow(
      new ConflictException('Já existe uma temporada com esse nome'),
    );
    expect(startSeasonEconomyUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejeita quando usuário ou time dos squads não existe', async () => {
    const { useCase, seasonsRepository } = buildUseCase();
    (seasonsRepository.createSquads as jest.Mock).mockRejectedValue(
      buildPrismaError('P2003'),
    );

    await expect(useCase.execute(dto)).rejects.toThrow(
      new BadRequestException('Usuário ou time não encontrado'),
    );
  });

  it('cria a temporada e inicia a economia no caminho feliz', async () => {
    const { useCase, startSeasonEconomyUseCase } = buildUseCase();

    await useCase.execute(dto);

    expect(startSeasonEconomyUseCase.execute).toHaveBeenCalledWith('season-1');
  });
});
