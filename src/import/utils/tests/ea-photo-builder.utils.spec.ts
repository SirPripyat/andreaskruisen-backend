import { buildEaPlayerPhotoUrl } from '../ea-photo-builder.utils';

describe('buildEaPlayerPhotoUrl', () => {
  it('monta a URL da foto EA a partir do eaId', () => {
    expect(buildEaPlayerPhotoUrl(212194)).toBe(
      'https://ratings-images-prod.pulse.ea.com/FC27/components/players/p212194.webp',
    );
  });
});
