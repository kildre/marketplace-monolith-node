// src/domain/errors/UnauthorizedRequestorException.ts

import MarketplaceError from './MarketplaceError';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized requestor.';

export class UnauthorizedAdjudicatorError extends MarketplaceError {
  constructor(adjucatorEmail: string) {
    super(ERR_MSG_FMT.replace('%s', adjucatorEmail), { status: 403, code: 'UNAUTHORIZED_ADJUCATOR' });
    this.name = 'UnauthorizedAdjudicatorError';

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
