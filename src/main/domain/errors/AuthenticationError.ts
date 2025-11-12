import MarketplaceError from './MarketplaceError';

export enum AuthenticationErrorCode {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN_FORMAT = 'INVALID_TOKEN_FORMAT',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_NOT_YET_VALID = 'TOKEN_NOT_YET_VALID',
  TOKEN_INACTIVE = 'TOKEN_INACTIVE',
  INVALID_ISSUER = 'INVALID_ISSUER',
  INVALID_AUDIENCE = 'INVALID_AUDIENCE',
  INTROSPECTION_FAILED = 'INTROSPECTION_FAILED',
  INTROSPECTION_ERROR = 'INTROSPECTION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AuthenticationErrorOptions {
  code: AuthenticationErrorCode;
  tokenHash?: string;
  subject?: string;
  issuer?: string;
  audience?: string | string[];
  expiration?: number;
  notBefore?: number;
  httpStatus?: number;
  path?: string;
  method?: string;
  ip?: string;
  cause?: unknown;
  details?: Record<string, unknown>;
}

/**
 * Error class for authentication failures.
 * Represents scenarios where token validation fails (401 errors).
 * Distinct from authorization errors (403) which indicate lack of permissions.
 */
export class AuthenticationError extends MarketplaceError {
  public readonly tokenHash?: string;
  public readonly subject?: string;
  public readonly issuer?: string;
  public readonly audience?: string | string[];
  public readonly expiration?: number;
  public readonly notBefore?: number;
  public readonly path?: string;
  public readonly method?: string;
  public readonly ip?: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, options: AuthenticationErrorOptions) {
    super(message, {
      status: options.httpStatus || 401,
      code: options.code,
      cause: options.cause,
    });

    this.name = 'AuthenticationError';
    this.tokenHash = options.tokenHash;
    this.subject = options.subject;
    this.issuer = options.issuer;
    this.audience = options.audience;
    this.expiration = options.expiration;
    this.notBefore = options.notBefore;
    this.path = options.path;
    this.method = options.method;
    this.ip = options.ip;
    this.details = options.details;

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a user-friendly error message suitable for logging (no sensitive token data).
   */
  toLogMessage(): string {
    const parts: string[] = [`[${this.name}] code=${this.code}`];

    if (this.tokenHash) parts.push(`tokenHash=${this.tokenHash}`);
    if (this.subject) parts.push(`sub=${this.subject}`);
    if (this.issuer) parts.push(`iss=${this.issuer}`);
    if (this.audience) parts.push(`aud=${JSON.stringify(this.audience)}`);
    if (this.expiration) parts.push(`exp=${this.expiration}`);
    if (this.notBefore) parts.push(`nbf=${this.notBefore}`);
    if (this.path) parts.push(`path=${this.path}`);
    if (this.method) parts.push(`method=${this.method}`);
    if (this.ip) parts.push(`ip=${this.ip}`);
    if (this.details) parts.push(`details=${JSON.stringify(this.details)}`);

    parts.push(`message="${this.message}"`);

    return parts.join(', ');
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

  /**
   * Factory method: Missing bearer token
   */
  static missingToken(path: string, method: string, ip?: string): AuthenticationError {
    return new AuthenticationError('Authentication required: missing bearer token', {
      code: AuthenticationErrorCode.MISSING_TOKEN,
      path,
      method,
      ip,
    });
  }

  /**
   * Factory method: Invalid token format
   */
  static invalidFormat(tokenHash: string, path: string, method: string): AuthenticationError {
    return new AuthenticationError('Invalid token format', {
      code: AuthenticationErrorCode.INVALID_TOKEN_FORMAT,
      tokenHash,
      path,
      method,
    });
  }

  /**
   * Factory method: Token expired
   */
  static expired(subject: string, expiration: number, now: number, tokenHash?: string): AuthenticationError {
    return new AuthenticationError(`Token expired at ${expiration}, current time ${now}`, {
      code: AuthenticationErrorCode.TOKEN_EXPIRED,
      subject,
      expiration,
      tokenHash,
      details: { now },
    });
  }

  /**
   * Factory method: Token not yet valid (nbf check)
   */
  static notYetValid(subject: string, notBefore: number, now: number, tokenHash?: string): AuthenticationError {
    return new AuthenticationError(`Token not valid before ${notBefore}, current time ${now}`, {
      code: AuthenticationErrorCode.TOKEN_NOT_YET_VALID,
      subject,
      notBefore,
      tokenHash,
      details: { now },
    });
  }

  /**
   * Factory method: Token inactive (from introspection)
   */
  static inactive(subject: string, path: string, tokenHash?: string): AuthenticationError {
    return new AuthenticationError('Token is inactive', {
      code: AuthenticationErrorCode.TOKEN_INACTIVE,
      subject,
      path,
      tokenHash,
    });
  }

  /**
   * Factory method: Invalid issuer
   */
  static invalidIssuer(
    subject: string,
    actualIssuer: string,
    expectedIssuer: string,
    tokenHash?: string
  ): AuthenticationError {
    return new AuthenticationError(`Invalid token issuer: expected "${expectedIssuer}", got "${actualIssuer}"`, {
      code: AuthenticationErrorCode.INVALID_ISSUER,
      subject,
      issuer: actualIssuer,
      tokenHash,
      details: { expectedIssuer },
      httpStatus: 403, // Issuer mismatch is more of an authorization issue
    });
  }

  /**
   * Factory method: Invalid audience
   */
  static invalidAudience(
    subject: string,
    actualAudience: string | string[],
    expectedAudience: string,
    tokenHash?: string
  ): AuthenticationError {
    return new AuthenticationError(
      `Invalid token audience: expected "${expectedAudience}", got ${JSON.stringify(actualAudience)}`,
      {
        code: AuthenticationErrorCode.INVALID_AUDIENCE,
        subject,
        audience: actualAudience,
        tokenHash,
        details: { expectedAudience },
        httpStatus: 403, // Audience mismatch is more of an authorization issue
      }
    );
  }

  /**
   * Factory method: Keycloak introspection HTTP error
   */
  static introspectionFailed(
    httpStatus: number,
    responsePreview: string,
    path: string,
    tokenHash?: string
  ): AuthenticationError {
    return new AuthenticationError(`Keycloak introspection request failed with HTTP ${httpStatus}`, {
      code: AuthenticationErrorCode.INTROSPECTION_FAILED,
      path,
      tokenHash,
      details: { httpStatus, responsePreview },
    });
  }

  /**
   * Factory method: General introspection error
   */
  static introspectionError(cause: unknown, path: string, method: string, tokenHash?: string): AuthenticationError {
    return new AuthenticationError('Token introspection error', {
      code: AuthenticationErrorCode.INTROSPECTION_ERROR,
      path,
      method,
      tokenHash,
      cause,
      httpStatus: 500,
    });
  }

  /**
   * Factory method: Internal error during authentication
   */
  static internalError(
    errorMessage: string,
    path: string,
    method: string,
    cause?: unknown
  ): AuthenticationError {
    return new AuthenticationError(`Internal authentication error: ${errorMessage}`, {
      code: AuthenticationErrorCode.INTERNAL_ERROR,
      path,
      method,
      cause,
      httpStatus: 500,
    });
  }
}
