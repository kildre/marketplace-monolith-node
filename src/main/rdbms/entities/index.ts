import { sequelize } from '../../config/sequelizeCLIConfig.cjs';
import { Sequelize } from 'sequelize';

import { MarketplaceUser } from './MarketplaceUser';
import { Status } from './Status';
import { Product } from './Product';
import { MarketplaceOrder } from './MarketplaceOrder';
import { OrderItem } from './OrderItem';
import { UseCaseRequest } from './UseCaseRequest';
import { Decision } from './Decision';
import { AssocCapable } from './types';
import { CartItem } from './CartItem';
import { SessionToken } from './SessionToken';

// 1) Init all models (fields + table options)
[
  MarketplaceUser, Status, 
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
  SessionToken,
].forEach((m) => (m as any).initModel(sequelize));

// 2) Run each model's own association logic
[
  MarketplaceUser, Status, 
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
  SessionToken,
].forEach((m) => {
  const assoc = (m as unknown as AssocCapable).associate;
  if (typeof assoc === 'function') assoc(sequelize as Sequelize);
});

export async function initDb(): Promise<void> {
  await sequelize.authenticate();
}

export {
  sequelize,
  MarketplaceUser, Status, 
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision, CartItem,
  SessionToken,
};
