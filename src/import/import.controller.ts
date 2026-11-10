import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import { MAX_IMPORT_FILE_SIZE } from './constants';
import { ImportPlayersDto, ImportPlayersSchema } from './dto';
import { UploadedJsonFile } from './types';
import {
  ImportPlayersUseCase,
  ImportTeamAliasesUseCase,
  ImportTeamCrestsUseCase,
  ImportTeamFormationsUseCase,
  ImportTeamLineupsUseCase,
} from './use-cases';

const requiredJsonFilePipe = new ParseFilePipe({
  exceptionFactory: () =>
    new BadRequestException('Envie o arquivo JSON no campo "file"'),
});

@Controller('import')
@UseGuards(SessionAuthGuard, AdminGuard)
export class ImportController {
  constructor(
    private readonly importPlayersUseCase: ImportPlayersUseCase,
    private readonly importTeamFormationsUseCase: ImportTeamFormationsUseCase,
    private readonly importTeamLineupsUseCase: ImportTeamLineupsUseCase,
    private readonly importTeamCrestsUseCase: ImportTeamCrestsUseCase,
    private readonly importTeamAliasesUseCase: ImportTeamAliasesUseCase,
  ) {}

  @Post('players')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importPlayers(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
    @Body(new ZodValidationPipe(ImportPlayersSchema)) dto: ImportPlayersDto,
  ) {
    return this.importPlayersUseCase.execute(
      file.buffer,
      dto.capturedAt ?? new Date(),
    );
  }

  @Post('team-formations')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamFormations(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.importTeamFormationsUseCase.execute(file.buffer);
  }

  @Post('team-lineups')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamLineups(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.importTeamLineupsUseCase.execute(file.buffer);
  }

  @Post('team-crests')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamCrests(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.importTeamCrestsUseCase.execute(file.buffer);
  }

  @Post('team-aliases')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamAliases(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.importTeamAliasesUseCase.execute(file.buffer);
  }
}
