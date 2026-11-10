export type TeamFormationImportSummary = {
  processed: number;
  updated: number;
  notFound: string[];
  ambiguous: string[];
  invalid: string[];
};
