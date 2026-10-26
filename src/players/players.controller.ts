import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ZodValidationPipe } from '../commons/pipes/zod-validation.pipe';
import {
  ImportPlayersDto,
  ImportPlayersSchema,
} from './dto/import-players.schema';
import { ListPlayersQuery, ListPlayersSchema } from './dto/list-players.schema';
import { PlayersService } from './players.service';

interface UploadedJsonFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024;

@Controller('players')
@UseGuards(SessionAuthGuard, AdminGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListPlayersSchema)) query: ListPlayersQuery,
  ) {
    return this.playersService.list(query);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async import(
    @UploadedFile() file: UploadedJsonFile | undefined,
    @Body(new ZodValidationPipe(ImportPlayersSchema)) dto: ImportPlayersDto,
  ) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo JSON no campo "file"');
    }

    const capturedAt = dto.capturedAt ?? new Date();
    return this.playersService.importFromJson(file.buffer, capturedAt);
  }
}
