import { z } from 'zod';

// Configuração da fase de grupos de um torneio GROUP_STAGE_KNOCKOUT (ver
// isValidGroupStageSetup em tournament-format-rules.utils.ts pra validação
// cruzada com maxTeams). Gravada em Tournament.groupStageConfig como JSON —
// validada aqui antes de gravar e revalidada sempre que lida (mesmo
// princípio do RulesetPayloadSchema), nunca confiada como está.
export const GroupStageConfigSchema = z
  .object({
    // Quantos times por grupo.
    groupSize: z.number().int().min(2),
    // Quantos times de cada grupo avançam pro mata-mata.
    qualifiersPerGroup: z.number().int().min(1),
    // Ida e volta dentro do grupo (cada time joga 2x contra cada adversário,
    // casa e fora) em vez de turno único.
    doubleRound: z.boolean(),
    // true = o sorteio tenta concentrar os times de participantes (donos via
    // Squad) nos mesmos grupos, preenchendo o resto com times CPU. false =
    // distribui os times de participantes um por grupo, round-robin,
    // misturando com CPU.
    keepOwnedTeamsInSameGroup: z.boolean(),
  })
  .refine((config) => config.qualifiersPerGroup <= config.groupSize, {
    message: 'qualifiersPerGroup não pode ser maior que groupSize',
    path: ['qualifiersPerGroup'],
  });

export type GroupStageConfig = z.infer<typeof GroupStageConfigSchema>;
