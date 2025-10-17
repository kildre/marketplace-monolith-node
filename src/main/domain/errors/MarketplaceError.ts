

interface PropsI {
  cause?: unknown;
  status?: number;
    code?: string;
}

export default class MarketplaceError extends Error {
    public readonly status?: number;
    public readonly code?: string;

    constructor(message: string, options?: PropsI) {
        super(message, {cause: options?.cause});
        this.name = "MarketplaceError";
        this.status = options?.status;
        this.code = options?.code;

        // Fix prototype chain (important for instanceof checks)
        Object.setPrototypeOf(this, new.target.prototype);
    }

}