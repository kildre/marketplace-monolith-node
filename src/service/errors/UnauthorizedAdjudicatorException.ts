// src/domain/errors/UnauthorizedRequestorException.ts
import { MarketplaceException } from './MarketplaceException';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized requestor.';

export class UnauthorizedAdjudicatorException extends MarketplaceException {
  constructor(adjucatorEmail: string) {
    super(ERR_MSG_FMT.replace('%s', adjucatorEmail), { status: 403, code: 'UNAUTHORIZED_ADJUCATOR' });
    this.name = 'UnauthorizedAdjudicatorException';
  }
}
