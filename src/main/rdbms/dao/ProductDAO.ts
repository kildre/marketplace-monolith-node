import { FindOptions } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { Product } from '../entities/Product';
import { OrderItem } from '../entities/OrderItem';

export class ProductDAO extends BaseDAO<Product> {
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
