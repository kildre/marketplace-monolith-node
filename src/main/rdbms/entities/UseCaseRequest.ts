// src/rdbms/entities/UseCaseRequest.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import { Status } from "./Status";
import { MarketplaceUser } from "./MarketplaceUser";
import { Decision } from "./Decision";
import { CartItem } from "./CartItem";

export class UseCaseRequest extends Model<
  InferAttributes<UseCaseRequest>,
  InferCreationAttributes<UseCaseRequest>
> {
  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare requestNumber: string;
  declare designation: string | null;
  declare agency: string | null;
  declare organization: string | null;
  declare otherOrganization: string | null;
  declare pointOfContact: string | null;
  declare email: string | null;
  declare requestedToolName: string;
  declare phoneNumber: string | null;
  declare estimatedRom: string | null;
  declare description: string;

  // associations (NonAttribute so Sequelize won’t treat them as columns)
  declare requestor?: NonAttribute<MarketplaceUser>;
  declare status?: NonAttribute<Status>;
  declare decisions?: NonAttribute<Decision[]>;
  declare cartItems?: NonAttribute<CartItem[]>;

  static initModel(sequelize: Sequelize) {
    UseCaseRequest.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestNumber: {
          type: DataTypes.STRING(32),
          allowNull: false,
          unique: true,
          field: "request_number",
        },
        designation: { type: DataTypes.STRING(128), allowNull: true },
        agency: { type: DataTypes.STRING(128), allowNull: true },
        organization: { type: DataTypes.STRING(128), allowNull: true },
        otherOrganization: {
          type: DataTypes.STRING(128),
          allowNull: true,
          field: "other_organization",
        },
        pointOfContact: {
          type: DataTypes.STRING(128),
          allowNull: true,
          field: "point_of_contact",
        },
        email: { type: DataTypes.STRING(128), allowNull: true },
        requestedToolName: {
          type: DataTypes.STRING(128),
          allowNull: false,
          field: "requested_tool_name",
        },
        phoneNumber: {
          type: DataTypes.STRING(32),
          allowNull: true,
          field: "phone_number",
        },
        estimatedRom: {
          type: DataTypes.STRING(32),
          allowNull: true,
          field: "estimated_rom",
        },
        description: { type: DataTypes.STRING(1024), allowNull: false },
        // Do NOT redeclare createdAt/updatedAt unless you really need to.
        // With timestamps: true + underscored: true, Sequelize uses created_at / updated_at automatically.
      },
      {
        sequelize,
        tableName: "use_case_request",
        underscored: true,
        timestamps: true, // expects created_at / updated_at in DB
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, Decision, CartItem } =
      sequelize.models as any;

    UseCaseRequest.belongsTo(MarketplaceUser, {
      foreignKey: { name: "requestorId", allowNull: false },
      as: "requestor",
    });

    UseCaseRequest.belongsTo(Status, {
      foreignKey: { name: "statusId", allowNull: false },
      as: "status",
    });

    UseCaseRequest.hasMany(Decision, {
      foreignKey: "requestId",
      as: "decisions",
    });

    UseCaseRequest.hasMany(CartItem, {
      foreignKey: "requestId",
      as: "cartItems",
    });
  }
}
