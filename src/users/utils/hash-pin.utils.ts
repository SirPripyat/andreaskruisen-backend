import { hash } from 'bcrypt';

export const hashPin = (pin: string, saltRounds: number): Promise<string> =>
  hash(pin, saltRounds);
