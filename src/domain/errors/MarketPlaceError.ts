

export default class MarketplaceError extends Error {


    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "MarketplaceError";

        // Fix prototype chain (important for instanceof checks)
        Object.setPrototypeOf(this, new.target.prototype);
    }

}