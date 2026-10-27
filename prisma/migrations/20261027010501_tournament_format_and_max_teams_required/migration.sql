/*
  Warnings:

  - The values [LEAGUE_PHASE_KNOCKOUT] on the enum `TournamentFormat` will be removed. If these variants are still used in the database, this will fail.
  - Made the column `maxTeams` on table `Tournament` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TournamentFormat_new" AS ENUM ('GROUP_STAGE', 'KNOCKOUT', 'GROUP_STAGE_KNOCKOUT');
ALTER TABLE "Tournament" ALTER COLUMN "format" TYPE "TournamentFormat_new" USING ("format"::text::"TournamentFormat_new");
ALTER TYPE "TournamentFormat" RENAME TO "TournamentFormat_old";
ALTER TYPE "TournamentFormat_new" RENAME TO "TournamentFormat";
DROP TYPE "TournamentFormat_old";
COMMIT;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "maxTeams" SET NOT NULL;
