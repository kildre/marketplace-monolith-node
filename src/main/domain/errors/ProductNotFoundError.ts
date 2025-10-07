
import MarketplaceError from './MarketPlaceError';

export class ProductNotFoundException  extends MarketplaceError {
  constructor(name: string) {
    super(`Product not found: ${name}`);
    this.name = "ProductNotFoundException";

    // Fix prototype chain (important for instanceof checks)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
