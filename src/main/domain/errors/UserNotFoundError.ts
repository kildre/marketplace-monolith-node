import MarketplaceError from "./MarketplaceError";

interface PropsI {
    email: string;
}

export default class CurrentUserNotFoundError extends MarketplaceError {
  constructor(props: PropsI) {
    super(`User with email ${props.email} not found.`, { status: 404, code: 'USER_NOT_FOUND'});
    this.name = 'UserNotFoundError';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
