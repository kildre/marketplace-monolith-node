import MarketplaceError from "./MarketplaceError";

// src/decisions/exceptions/usecase-request-not-found.exception.ts
export class UseCaseRequestNotFoundError extends MarketplaceError {
  constructor(requestNumber: string) {
    super(`UseCaseRequest with requestNumber=${requestNumber} not found.`, { status: 404, code: 'USE_CASE_REQUEST_NOT_FOUND'});
    this.name = 'UseCaseRequestNotFoundError';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
