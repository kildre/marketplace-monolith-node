import { UnauthorizedUserError } from './UnauthorizedUserError';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized requestor.';

export interface UnauthorizedRequestorErrorOptions {
  requestorEmail: string;
  requiredRole?: string;
  actualRoles?: string[];
  cause?: unknown;
}

/**
 * Error thrown when a user attempts to perform a requestor-only action
 * but lacks the required requestor role.
 */
export class UnauthorizedRequestorError extends UnauthorizedUserError {
  constructor(options: UnauthorizedRequestorErrorOptions | string) {
    // Support legacy string-only constructor for backward compatibility
    const opts = typeof options === 'string' 
      ? { requestorEmail: options } 
      : options;

    super(ERR_MSG_FMT.replace('%s', opts.requestorEmail), {
      userEmail: opts.requestorEmail,
      requiredRole: opts.requiredRole,
      actualRoles: opts.actualRoles,
      cause: opts.cause,
    });

    this.name = 'UnauthorizedRequestorError';
    // Override code via Object.defineProperty since it's readonly
    Object.defineProperty(this, 'code', {
      value: 'UNAUTHORIZED_REQUESTOR',
      writable: false,
      enumerable: true,
    });

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
