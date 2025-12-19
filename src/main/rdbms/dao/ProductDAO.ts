import { FindOptions } from 'sequelize';
import { Product } from '../entities/Product';
import { OrderItem } from '../entities/OrderItem';
import { IdDao } from './IdDao';

export class ProductDAO extends IdDao<Product> {
  constructor() {
    super(Product);
  }

  async findByName(name: string, options?: FindOptions): Promise<Product | null> {
    return Product.findOne({ where: { name }, ...options });
  }

  async getWithOrderItems(productId: number, options?: FindOptions): Promise<Product | null> {
    return Product.findByPk(productId, {
      include: [{ model: OrderItem, as: 'orderItems' }],
      ...options,
    });
  }
}
