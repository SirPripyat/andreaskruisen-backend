import { z } from 'zod';

// Formato do arquivo gerado em data/team-crest-notfound.json (ver
// team-crest-import.ts): cada entrada é um time do catálogo de times da EA
// que não bateu nem por nome nem por alias existente. O humano preenche
// resolved_team_name com o Team.name correto e resubmete o mesmo arquivo em
// POST /teams/import-aliases. Campos como region/leagues/logo/note só
// ajudam o humano a decidir e são ignorados pelo zod.
const TeamAliasResolutionEntrySchema = z.object({
  json_name: z.string().min(1),
  resolved_team_name: z.string().min(1).nullable().optional(),
});

export const TeamAliasResolutionFileSchema = z.object({
  entries: z.array(TeamAliasResolutionEntrySchema),
});

export type TeamAliasResolutionEntry = z.infer<
  typeof TeamAliasResolutionEntrySchema
>;
export type TeamAliasResolutionFile = z.infer<
  typeof TeamAliasResolutionFileSchema
>;
