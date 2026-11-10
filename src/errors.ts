export class DomainError extends Error {
  readonly errorCode: string;

  constructor(errorCode: string) {
    super(errorCode);
    this.name = "DomainError";
    this.errorCode = errorCode;
  }
}
