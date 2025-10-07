import MarketplaceError from "./MarketPlaceError";

// src/decisions/exceptions/usecase-request-not-found.exception.ts
export class UseCaseRequestNotFoundException extends MarketplaceError {
  constructor(requestNumber: string) {
    super(`UseCaseRequest with requestNumber=${requestNumber} not found.`, { status: 400, code: 'USE_CASE_REQUEST_NOT_FOUND'});
    this.name = 'UseCaseRequestNotFoundException';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
