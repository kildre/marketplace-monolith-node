// src/decisions/exceptions/usecase-request-not-found.exception.ts
export class UseCaseRequestNotFoundException extends Error {
  constructor(requestNumber: string) {
    super(`UseCaseRequest with requestNumber=${requestNumber} not found.`);
    this.name = 'UseCaseRequestNotFoundException';
  }
}
