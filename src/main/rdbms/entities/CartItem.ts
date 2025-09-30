// src/rdbms/entities/CartItem.ts
import {
    DataTypes,
    Model,
    Sequelize,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    NonAttribute,
} from 'sequelize';
import { UseCaseRequest } from './UseCaseRequest';
import { Product } from './Product';

export class CartItem
    extends Model<InferAttributes<CartItem>, InferCreationAttributes<CartItem>> {

    // columns (type-only; not emitted at runtime)
    declare id: CreationOptional<number>;
    declare quantity: number;

    // foreign keys (optional but handy for typing)
    declare requestId: number; // maps to request_id
    declare productId: number; // maps to product_id

    // associations (NonAttribute so Sequelize doesn't treat them as columns)
    declare request?: NonAttribute<UseCaseRequest>;
    declare product?: NonAttribute<Product>;

    static initModel(sequelize: Sequelize) {
        CartItem.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                quantity: { type: DataTypes.INTEGER, allowNull: false },

                // FK columns (add these so you can read/write them directly)
                requestId: { type: DataTypes.INTEGER, allowNull: false, field: 'request_id' },
                productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
            },
            {
                sequelize,
                tableName: 'cart_item',
                underscored: true,
                timestamps: false,
            }
        );
    }

    static associate(sequelize: Sequelize) {
        const { UseCaseRequest, Product } = sequelize.models as any;

        CartItem.belongsTo(UseCaseRequest, {
            foreignKey: 'requestId',
            as: 'request',
        });

        CartItem.belongsTo(Product, {
            foreignKey: 'productId',
            as: 'product',
        });
    }
}
