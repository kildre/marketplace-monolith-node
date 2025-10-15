
import MarketplaceError from './MarketplaceError';

export class ProductNotFoundError  extends MarketplaceError {
  constructor(name: string) {
    super(`Product not found: ${name}`, { status: 404, code: 'PRODUCT_NOT_FOUND' });
    this.name = "ProductNotFoundError";

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
