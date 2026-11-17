import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RunSeasonAuditUseCase } from './use-cases';

@Controller('seasons/:seasonId/audit')
@UseGuards(SessionAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly runSeasonAuditUseCase: RunSeasonAuditUseCase) {}

  @Get()
  run(@Param('seasonId') seasonId: string) {
    return this.runSeasonAuditUseCase.execute(seasonId);
  }
}
