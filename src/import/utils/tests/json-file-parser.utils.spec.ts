import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { parseJsonBuffer } from '../json-file-parser.utils';

const SCHEMA = z.object({ name: z.string() });

describe('parseJsonBuffer', () => {
  it('retorna os dados parseados quando o JSON bate com o schema', () => {
    const buffer = Buffer.from(JSON.stringify({ name: 'Ajax' }));

    expect(parseJsonBuffer(buffer, SCHEMA, 'times')).toEqual({
      name: 'Ajax',
    });
  });

  it('lança BadRequestException quando o buffer não é um JSON válido', () => {
    const buffer = Buffer.from('não é json');

    expect(() => parseJsonBuffer(buffer, SCHEMA, 'times')).toThrow(
      BadRequestException,
    );
    expect(() => parseJsonBuffer(buffer, SCHEMA, 'times')).toThrow(
      'Arquivo não é um JSON válido',
    );
  });

  it('lança BadRequestException com o label e os issues quando o JSON não bate com o schema', () => {
    const buffer = Buffer.from(JSON.stringify({ name: 123 }));

    expect.assertions(2);
    try {
      parseJsonBuffer(buffer, SCHEMA, 'times');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: 'JSON não corresponde ao schema de times esperado',
      });
    }
  });
});
