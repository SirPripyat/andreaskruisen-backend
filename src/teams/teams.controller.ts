import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ListTeamsQuery, ListTeamsSchema } from './dto/list-teams.schema';
import { UpdateTeam, UpdateTeamSchema } from './dto/update-team.schema';
import { TeamsService } from './teams.service';

interface UploadedJsonFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024;

@Controller('teams')
@UseGuards(SessionAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // Catálogo completo: ferramenta de administração de dados, por isso só
  // admin (igual sempre foi). Ver getOne abaixo pra acesso de um time só.
  @Get()
  @UseGuards(AdminGuard)
  async list(
    @Query(new ZodValidationPipe(ListTeamsSchema)) query: ListTeamsQuery,
  ) {
    return this.teamsService.list(query);
  }

  // Tela de gerenciamento de um time: qualquer participante autenticado
  // pode abrir (ex.: ao clicar no nome do time dentro de um torneio), não
  // só admin.
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.teamsService.getOne(id);
  }

  @Get(':id/titles')
  async getTitles(@Param('id') id: string) {
    return this.teamsService.getTitles(id);
  }

  // Edição do catálogo (nome, crestUrl, liga, formação): ferramenta de
  // administração de dados, por isso só admin, igual ao list acima.
  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTeamSchema)) dto: UpdateTeam,
  ) {
    return this.teamsService.update(id, dto);
  }

  // Importação do JSON de formações do scraper (arquivo separado do de
  // jogadores): só name + formação por time, sem crestUrl pra desambiguar
  // nomes repetidos — ver TeamsService.importFormationsFromJson.
  @Post('import-formations')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importFormations(@UploadedFile() file: UploadedJsonFile | undefined) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo JSON no campo "file"');
    }

    return this.teamsService.importFormationsFromJson(file.buffer);
  }

  // Importação do JSON de escalações titulares do SoFIFA (arquivo separado
  // do de jogadores e do de formações): casa cada titular pelo eaId, resolve
  // o time e grava formação + escalação — ver TeamsService.importLineupsFromJson.
  @Post('import-lineups')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importLineups(@UploadedFile() file: UploadedJsonFile | undefined) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo JSON no campo "file"');
    }

    return this.teamsService.importLineupsFromJson(file.buffer);
  }

  // Sobrescreve crestUrl a partir do catálogo oficial de times da EA
  // (arquivo separado dos demais imports): casa por name + liga, ignora
  // times femininos — ver TeamsService.importCrestsFromJson.
  @Post('import-crests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importCrests(@UploadedFile() file: UploadedJsonFile | undefined) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo JSON no campo "file"');
    }

    return this.teamsService.importCrestsFromJson(file.buffer);
  }

  // Resolução manual dos "notFound" do import-crests: suba o mesmo arquivo
  // gerado em data/team-crest-notfound.json depois de preencher
  // resolved_team_name nas entradas que reconhecer — cria o TeamAlias
  // correspondente. Rode import-crests de novo depois pra aplicar o escudo.
  @Post('import-aliases')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  async importAliases(@UploadedFile() file: UploadedJsonFile | undefined) {
    if (!file) {
      throw new BadRequestException('Envie o arquivo JSON no campo "file"');
    }

    return this.teamsService.importAliasesFromJson(file.buffer);
  }
}
