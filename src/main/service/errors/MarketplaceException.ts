// src/domain/errors/MarketplaceException.ts
export class MarketplaceException extends Error {
  public status?: number;
  public code?: string;
  public cause?: unknown;

  constructor(message: string, opts?: { status?: number; code?: string; cause?: unknown }) {
    super(message);
    this.name = 'MarketplaceException';
    this.status = opts?.status;
    this.code = opts?.code;
    this.cause = opts?.cause;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
