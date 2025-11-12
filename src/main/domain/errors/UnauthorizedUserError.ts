import MarketplaceError from './MarketplaceError';

export interface UnauthorizedUserErrorOptions {
  userEmail: string;
  requiredRole?: string;
  actualRoles?: string[];
  cause?: unknown;
}

/**
 * Base class for unauthorized user errors.
 * Represents scenarios where a user is authenticated but lacks required authorization.
 */
export class UnauthorizedUserError extends MarketplaceError {
  public readonly userEmail: string;
  public readonly requiredRole?: string;
  public readonly actualRoles?: string[];

  constructor(message: string, options: UnauthorizedUserErrorOptions) {
    super(message, {
      status: 403,
      code: 'UNAUTHORIZED_USER',
      cause: options.cause,
    });

    this.name = 'UnauthorizedUserError';
    this.userEmail = options.userEmail;
    this.requiredRole = options.requiredRole;
    this.actualRoles = options.actualRoles;

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a user-friendly error message suitable for logging (no sensitive data).
   */
  toLogMessage(): string {
    const roleInfo = this.requiredRole
      ? `, required_role=${this.requiredRole}`
      : '';
    const actualInfo = this.actualRoles && this.actualRoles.length > 0
      ? `, actual_roles=${JSON.stringify(this.actualRoles)}`
      : '';
    return `[${this.name}] user=${this.userEmail}${roleInfo}${actualInfo}, message=${this.message}`;
  }

  /**
   * Returns a safe error response for API clients (no internal details).
   */
  toClientResponse() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
    };
  }
}
