import { UnauthorizedUserError } from './UnauthorizedUserError';

const ERR_MSG_FMT =
  'The provided email address %s does not correspond to an authorized adjudicator.';

export interface UnauthorizedAdjudicatorErrorOptions {
  adjudicatorEmail: string;
  requiredRole?: string;
  actualRoles?: string[];
  cause?: unknown;
}

/**
 * Error thrown when a user attempts to perform an adjudicator-only action
 * but lacks the required adjudicator role.
 */
export class UnauthorizedAdjudicatorError extends UnauthorizedUserError {
  constructor(options: UnauthorizedAdjudicatorErrorOptions | string) {
    // Support legacy string-only constructor for backward compatibility
    const opts = typeof options === 'string' 
      ? { adjudicatorEmail: options } 
      : options;

    super(ERR_MSG_FMT.replace('%s', opts.adjudicatorEmail), {
      userEmail: opts.adjudicatorEmail,
      requiredRole: opts.requiredRole,
      actualRoles: opts.actualRoles,
      cause: opts.cause,
    });

    this.name = 'UnauthorizedAdjudicatorError';
    // Override code via Object.defineProperty since it's readonly
    Object.defineProperty(this, 'code', {
      value: 'UNAUTHORIZED_ADJUDICATOR',
      writable: false,
      enumerable: true,
    });

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
