import { z } from 'zod';
import { GroupStageConfigSchema } from '../../schemas';
import { isValidGroupStageSetup, isValidMaxTeams } from '../../utils';

export const CreateTournamentSchema = z
  .object({
    name: z.string().min(1),
    format: z.enum(['LEAGUE', 'KNOCKOUT', 'GROUP_STAGE_KNOCKOUT']),
    maxTeams: z.number().int(),
    // Elenco completo do torneio: precisa estar aqui porque as partidas da
    // primeira fase já são geradas na criação (ver CreateTournamentUseCase).
    teamIds: z.array(z.uuid()),
    // Obrigatório só pra format = GROUP_STAGE_KNOCKOUT (ver refines abaixo).
    groupStageConfig: GroupStageConfigSchema.optional(),
  })
  .refine(
    (data) =>
      data.format !== 'GROUP_STAGE_KNOCKOUT' ||
      data.groupStageConfig !== undefined,
    {
      message:
        'groupStageConfig é obrigatório para o formato GROUP_STAGE_KNOCKOUT',
      path: ['groupStageConfig'],
    },
  )
  .refine(
    (data) =>
      data.format === 'GROUP_STAGE_KNOCKOUT' ||
      data.groupStageConfig === undefined,
    {
      message: 'groupStageConfig só se aplica ao formato GROUP_STAGE_KNOCKOUT',
      path: ['groupStageConfig'],
    },
  )
  .refine(
    (data) =>
      data.format === 'GROUP_STAGE_KNOCKOUT' ||
      isValidMaxTeams(data.format, data.maxTeams),
    {
      message: 'Número de times inválido para esse formato de torneio',
      path: ['maxTeams'],
    },
  )
  .refine(
    (data) =>
      data.format !== 'GROUP_STAGE_KNOCKOUT' ||
      (data.groupStageConfig !== undefined &&
        isValidGroupStageSetup(data.maxTeams, data.groupStageConfig)),
    {
      message:
        'maxTeams incompatível com groupSize/qualifiersPerGroup: precisa ser múltiplo de groupSize e o total de classificados precisa ser pelo menos 2',
      path: ['maxTeams'],
    },
  )
  .refine((data) => data.teamIds.length === data.maxTeams, {
    message: 'A quantidade de times deve ser igual a maxTeams',
    path: ['teamIds'],
  })
  .refine((data) => new Set(data.teamIds).size === data.teamIds.length, {
    message: 'Cada time só pode aparecer uma vez',
    path: ['teamIds'],
  });

export type CreateTournamentRequestDTO = z.infer<typeof CreateTournamentSchema>;
