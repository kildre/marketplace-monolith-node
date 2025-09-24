import { DataTypes, Model, Sequelize } from 'sequelize';
import { UseCaseRequest } from './UseCaseRequest';
import { Product } from './Product';

export class CartItem extends Model {
    public id!: number;
    public quantity!: number;

    // association props
    public request?: UseCaseRequest;
    public Product?: Product;

    static initModel(sequelize: Sequelize) {
        CartItem.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                quantity: { type: DataTypes.INTEGER, allowNull: false },
            },
                { sequelize, tableName: 'cart_item', underscored: true, timestamps: false }
            );
    }

    static associate(sequelize: Sequelize) {
        const { UseCaseRequest, Product } = sequelize.models as any;

        CartItem.belongsTo(UseCaseRequest,   { foreignKey: { name: 'request_id', allowNull: false},     as: 'request' });
        CartItem.belongsTo(Product, { foreignKey: { name: 'product_id', allowNull: false },       as: 'product' });
    }

}
