import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RunSeasonAuditUseCase } from './use-cases';

@Controller('seasons/:seasonId/audit')
@Roles(UserRole.ADMIN)
@UseGuards(SessionAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly runSeasonAuditUseCase: RunSeasonAuditUseCase) {}

  @Get()
  run(@Param('seasonId') seasonId: string) {
    return this.runSeasonAuditUseCase.execute(seasonId);
  }
}
