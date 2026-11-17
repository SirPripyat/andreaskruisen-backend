import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types';
import {
  AssignSquadRequestDTO,
  AssignSquadResponseDTO,
  ChangeSquadFormationRequestDTO,
  ChangeSquadFormationResponseDTO,
  ChooseSquadRequestDTO,
  ChooseSquadResponseDTO,
  GetMySquadResponseDTO,
  GetSquadLineupResponseDTO,
  ListSquadRosterResponseDTO,
  ListSquadsResponseDTO,
  SetLineupStarterRequestDTO,
  SetLineupStarterResponseDTO,
  SwapLineupStarterRequestDTO,
  SwapLineupStarterResponseDTO,
} from './dto';
import {
  AssignSquadUseCase,
  ChangeSquadFormationUseCase,
  ChooseSquadUseCase,
  GetMySquadUseCase,
  GetSquadLineupUseCase,
  ListSquadRosterUseCase,
  ListSquadsUseCase,
  SetLineupStarterUseCase,
  SwapLineupStarterUseCase,
} from './use-cases';

@Injectable()
export class SquadsFacade {
  constructor(
    private readonly listSquadsUseCase: ListSquadsUseCase,
    private readonly chooseSquadUseCase: ChooseSquadUseCase,
    private readonly assignSquadUseCase: AssignSquadUseCase,
    private readonly listSquadRosterUseCase: ListSquadRosterUseCase,
    private readonly getSquadLineupUseCase: GetSquadLineupUseCase,
    private readonly getMySquadUseCase: GetMySquadUseCase,
    private readonly swapLineupStarterUseCase: SwapLineupStarterUseCase,
    private readonly setLineupStarterUseCase: SetLineupStarterUseCase,
    private readonly changeSquadFormationUseCase: ChangeSquadFormationUseCase,
  ) {}

  listForSeason(seasonId: string): Promise<ListSquadsResponseDTO> {
    return this.listSquadsUseCase.execute(seasonId);
  }

  choose(
    userId: string,
    seasonId: string,
    dto: ChooseSquadRequestDTO,
  ): Promise<ChooseSquadResponseDTO> {
    return this.chooseSquadUseCase.execute(userId, seasonId, dto);
  }

  getMine(userId: string, seasonId: string): Promise<GetMySquadResponseDTO> {
    return this.getMySquadUseCase.execute(userId, seasonId);
  }

  listRoster(
    seasonId: string,
    teamId: string,
  ): Promise<ListSquadRosterResponseDTO> {
    return this.listSquadRosterUseCase.execute(seasonId, teamId);
  }

  getLineup(
    seasonId: string,
    teamId: string,
  ): Promise<GetSquadLineupResponseDTO> {
    return this.getSquadLineupUseCase.execute(seasonId, teamId);
  }

  swapLineupStarter(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    dto: SwapLineupStarterRequestDTO,
  ): Promise<SwapLineupStarterResponseDTO> {
    return this.swapLineupStarterUseCase.execute(seasonId, user, teamId, dto);
  }

  setLineupStarter(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    playerId: string,
    dto: SetLineupStarterRequestDTO,
  ): Promise<SetLineupStarterResponseDTO> {
    return this.setLineupStarterUseCase.execute(
      seasonId,
      user,
      teamId,
      playerId,
      dto,
    );
  }

  changeFormation(
    seasonId: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    teamId: string,
    dto: ChangeSquadFormationRequestDTO,
  ): Promise<ChangeSquadFormationResponseDTO> {
    return this.changeSquadFormationUseCase.execute(
      seasonId,
      user,
      teamId,
      dto,
    );
  }

  assign(
    seasonId: string,
    dto: AssignSquadRequestDTO,
  ): Promise<AssignSquadResponseDTO> {
    return this.assignSquadUseCase.execute(seasonId, dto);
  }
}
