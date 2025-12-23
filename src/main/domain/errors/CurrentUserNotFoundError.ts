import MarketplaceError from "./MarketplaceError";

export class CurrentUserNotFoundError extends MarketplaceError {
  constructor() {
    super(`Current User not found.`, { status: 404, code: 'CURRENT_USER_NOT_FOUND'});
    this.name = 'CurrentUserNotFoundError';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
