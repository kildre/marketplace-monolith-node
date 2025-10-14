// src/domain/errors/UnauthorizedRequestorException.ts

import MarketplaceError from './MarketplaceError';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized requestor.';

export class UnauthorizedRequestorError extends MarketplaceError {
  constructor(requestorEmail: string) {
    super(ERR_MSG_FMT.replace('%s', requestorEmail), { status: 403, code: 'UNAUTHORIZED_REQUESTOR' });
    this.name = 'UnauthorizedRequestorError';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
