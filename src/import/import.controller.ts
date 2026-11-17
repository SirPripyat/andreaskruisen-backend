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
import { ImportPlayersRequestDTO, ImportPlayersSchema } from './dto';
import { ImportFacade } from './import.facade';
import { UploadedJsonFile } from './types';

const requiredJsonFilePipe = new ParseFilePipe({
  exceptionFactory: () =>
    new BadRequestException('Envie o arquivo JSON no campo "file"'),
});

@Controller('import')
@UseGuards(SessionAuthGuard, AdminGuard)
export class ImportController {
  constructor(private readonly facade: ImportFacade) {}

  @Post('players')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importPlayers(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
    @Body(new ZodValidationPipe(ImportPlayersSchema))
    dto: ImportPlayersRequestDTO,
  ) {
    return this.facade.importPlayers(file.buffer, dto.capturedAt ?? new Date());
  }

  @Post('fcm-players')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importFcmPlayers(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
    @Body(new ZodValidationPipe(ImportPlayersSchema))
    dto: ImportPlayersRequestDTO,
  ) {
    return this.facade.importFcmPlayers(
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
    return this.facade.importTeamFormations(file.buffer);
  }

  @Post('team-lineups')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamLineups(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.facade.importTeamLineups(file.buffer);
  }

  @Post('team-crests')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamCrests(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.facade.importTeamCrests(file.buffer);
  }

  @Post('team-aliases')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importTeamAliases(
    @UploadedFile(requiredJsonFilePipe) file: UploadedJsonFile,
  ) {
    return this.facade.importTeamAliases(file.buffer);
  }
}
