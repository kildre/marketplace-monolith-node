import { sequelize } from '../config/sequelizeConfig';

import { MarketplaceUser } from './MarketplaceUser';
import { Role } from './Role';
import { Status } from './Status';
import { UserRole } from './UserRole';
import { Product } from './Product';
import { MarketplaceOrder } from './MarketplaceOrder';
import { OrderItem } from './OrderItem';
import { UseCaseRequest } from './UseCaseRequest';
import { Decision } from './Decision';

// ---- Associations ----

// User ↔ Role (many-to-many via user_roles)
MarketplaceUser.belongsToMany(Role, {
  through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles'
});
Role.belongsToMany(MarketplaceUser, {
  through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users'
});

// UseCaseRequest: requestor + status
UseCaseRequest.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
MarketplaceUser.hasMany(UseCaseRequest, { foreignKey: 'requestor_id', as: 'requests' });
UseCaseRequest.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

// Order: requestor + status + items
MarketplaceOrder.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
MarketplaceUser.hasMany(MarketplaceOrder, { foreignKey: 'requestor_id', as: 'orders' });
MarketplaceOrder.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });
MarketplaceOrder.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(MarketplaceOrder, { foreignKey: 'order_id', as: 'order' });

// Product ↔ OrderItem
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });

// Decision: adjudicator, request, order, status
Decision.belongsTo(MarketplaceUser, { foreignKey: 'adjudicator_id', as: 'adjudicator' });
MarketplaceUser.hasMany(Decision, { foreignKey: 'adjudicator_id', as: 'decisions' });
Decision.belongsTo(UseCaseRequest, { foreignKey: 'request_id', as: 'request' });
UseCaseRequest.hasMany(Decision, { foreignKey: 'request_id', as: 'decisions' });
Decision.belongsTo(MarketplaceOrder, { foreignKey: 'order_id', as: 'order' });
MarketplaceOrder.hasMany(Decision, { foreignKey: 'order_id', as: 'decisions' });
Decision.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

// ---- Init helper ----
export async function initDb(): Promise<void> {
  await sequelize.authenticate();
  // DO NOT sync in prod against an existing schema unless you control it:
  // await sequelize.sync({ alter: false });
}

export {
  sequelize,
  MarketplaceUser, Role, Status, UserRole,
  Product, MarketplaceOrder, OrderItem,
  UseCaseRequest, Decision
};
