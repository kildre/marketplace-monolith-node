// src/domain/errors/UnauthorizedRequestorException.ts
import { MarketplaceException } from './MarketplaceException';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized requestor.';

export class UnauthorizedRequestorException extends MarketplaceException {
  constructor(requestorEmail: string) {
    super(ERR_MSG_FMT.replace('%s', requestorEmail), { status: 403, code: 'UNAUTHORIZED_REQUESTOR' });
    this.name = 'UnauthorizedRequestorException';
  }
}
