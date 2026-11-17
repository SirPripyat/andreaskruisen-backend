import { Injectable } from '@nestjs/common';
import {
  ImportFcmPlayersResponseDTO,
  ImportPlayersResponseDTO,
  ImportTeamAliasesResponseDTO,
  ImportTeamCrestsResponseDTO,
  ImportTeamFormationsResponseDTO,
  ImportTeamLineupsResponseDTO,
} from './dto';
import {
  ImportFcmPlayersUseCase,
  ImportPlayersUseCase,
  ImportTeamAliasesUseCase,
  ImportTeamCrestsUseCase,
  ImportTeamFormationsUseCase,
  ImportTeamLineupsUseCase,
} from './use-cases';

@Injectable()
export class ImportFacade {
  constructor(
    private readonly importPlayersUseCase: ImportPlayersUseCase,
    private readonly importFcmPlayersUseCase: ImportFcmPlayersUseCase,
    private readonly importTeamFormationsUseCase: ImportTeamFormationsUseCase,
    private readonly importTeamLineupsUseCase: ImportTeamLineupsUseCase,
    private readonly importTeamCrestsUseCase: ImportTeamCrestsUseCase,
    private readonly importTeamAliasesUseCase: ImportTeamAliasesUseCase,
  ) {}

  importPlayers(
    fileBuffer: Buffer,
    capturedAt: Date,
  ): Promise<ImportPlayersResponseDTO> {
    return this.importPlayersUseCase.execute(fileBuffer, capturedAt);
  }

  importFcmPlayers(
    fileBuffer: Buffer,
    capturedAt: Date,
  ): Promise<ImportFcmPlayersResponseDTO> {
    return this.importFcmPlayersUseCase.execute(fileBuffer, capturedAt);
  }

  importTeamFormations(
    fileBuffer: Buffer,
  ): Promise<ImportTeamFormationsResponseDTO> {
    return this.importTeamFormationsUseCase.execute(fileBuffer);
  }

  importTeamLineups(fileBuffer: Buffer): Promise<ImportTeamLineupsResponseDTO> {
    return this.importTeamLineupsUseCase.execute(fileBuffer);
  }

  importTeamCrests(fileBuffer: Buffer): Promise<ImportTeamCrestsResponseDTO> {
    return this.importTeamCrestsUseCase.execute(fileBuffer);
  }

  importTeamAliases(fileBuffer: Buffer): Promise<ImportTeamAliasesResponseDTO> {
    return this.importTeamAliasesUseCase.execute(fileBuffer);
  }
}
