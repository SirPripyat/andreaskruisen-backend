import { isValidMaxTeams } from './tournament-format-rules';

describe('isValidMaxTeams', () => {
  describe('GROUP_STAGE', () => {
    it.each([4, 8, 12, 16, 20, 24])('aceita %i times', (maxTeams) => {
      expect(isValidMaxTeams('GROUP_STAGE', maxTeams)).toBe(true);
    });

    it.each([3, 10, 25])('rejeita %i times', (maxTeams) => {
      expect(isValidMaxTeams('GROUP_STAGE', maxTeams)).toBe(false);
    });
  });

  describe('KNOCKOUT', () => {
    it.each([2, 4, 8, 16, 32, 64])('aceita %i times', (maxTeams) => {
      expect(isValidMaxTeams('KNOCKOUT', maxTeams)).toBe(true);
    });

    it.each([1, 3, 6, 128])('rejeita %i times', (maxTeams) => {
      expect(isValidMaxTeams('KNOCKOUT', maxTeams)).toBe(false);
    });
  });

  describe('GROUP_STAGE_KNOCKOUT', () => {
    it.each([4, 8, 16, 32, 64])('aceita %i times', (maxTeams) => {
      expect(isValidMaxTeams('GROUP_STAGE_KNOCKOUT', maxTeams)).toBe(true);
    });

    it.each([2, 3, 6, 128])('rejeita %i times', (maxTeams) => {
      expect(isValidMaxTeams('GROUP_STAGE_KNOCKOUT', maxTeams)).toBe(false);
    });
  });
});
