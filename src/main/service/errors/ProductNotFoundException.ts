import { MarketplaceException } from './MarketplaceException';

export class ProductNotFoundException  extends MarketplaceException {
  constructor(name: string) {
    super(`Product not found: ${name}`);
    this.name = "ProductNotFoundException";
  }
}
