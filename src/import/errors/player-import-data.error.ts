export class PlayerImportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerImportDataError';
    Object.setPrototypeOf(this, PlayerImportDataError.prototype);
  }
}
