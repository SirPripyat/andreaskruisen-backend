import { PlayerImportDataError } from './player-import-data.error';

export class DimensionNotResolvedError extends PlayerImportDataError {
  constructor(message: string) {
    super(message);
    this.name = 'DimensionNotResolvedError';
    Object.setPrototypeOf(this, DimensionNotResolvedError.prototype);
  }
}
