import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.service';
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
