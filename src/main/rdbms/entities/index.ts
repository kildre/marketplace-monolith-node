import { sequelize } from '../../config/sequelizeCLIConfig.cjs';
import { Sequelize } from 'sequelize';

import { MarketplaceUser } from './MarketplaceUser';
import { Role } from './Role';
import { Status } from './Status';
import { UserRole } from './UserRole';
import { Product } from './Product';
import { MarketplaceOrder } from './MarketplaceOrder';
import { OrderItem } from './OrderItem';
import { UseCaseRequest } from './UseCaseRequest';
import { Decision } from './Decision';
import { AssocCapable } from './types';
import { CartItem } from './CartItem';

// 1) Init all models (fields + table options)
[
  MarketplaceUser, Role, Status, UserRole,
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
].forEach((m) => (m as any).initModel(sequelize));

// 2) Run each model's own association logic
[
  MarketplaceUser, Role, Status, UserRole,
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
].forEach((m) => {
  const assoc = (m as unknown as AssocCapable).associate;
  if (typeof assoc === 'function') assoc(sequelize as Sequelize);
});

export async function initDb(): Promise<void> {
  await sequelize.authenticate();
}

export {
  sequelize,
  MarketplaceUser, Role, Status, UserRole,
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
};
