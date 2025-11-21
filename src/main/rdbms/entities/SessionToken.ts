// src/rdbms/entities/SessionToken.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';

export class SessionToken
  extends Model<InferAttributes<SessionToken>, InferCreationAttributes<SessionToken>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare sessionId: string;
  declare accessToken: string;
  declare refreshToken: CreationOptional<string | null>;
  declare keycloakUserId: CreationOptional<string | null>;
  declare username: CreationOptional<string | null>;
  declare realmRoles: CreationOptional<string[] | null>;
  declare resourceRoles: CreationOptional<any>;
  declare tokenExp: Date;
  declare lastUsedAt: CreationOptional<Date | null>;
  declare revokedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize) {
    SessionToken.init(
      {
        id: {
          type: DataTypes.BIGINT,
          primaryKey: true,
          autoIncrement: true,
        },
        sessionId: {
          type: DataTypes.STRING(128),
          allowNull: false,
          unique: true,
          field: "session_id",
        },
        accessToken: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: "access_token",
        },
        refreshToken: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "refresh_token",
        },
        keycloakUserId: {
          type: DataTypes.STRING(256),
          allowNull: true,
          field: "keycloak_user_id",
        },
        username: {
          type: DataTypes.STRING(256),
          allowNull: true,
          field: "username",
        },
        realmRoles: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
          field: "realm_roles",
        },
        resourceRoles: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: "resource_roles",
        },
        tokenExp: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "token_exp",
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "last_used_at",
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "revoked_at",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
          field: "created_at",
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn("NOW"),
          field: "updated_at",
        },
      },
      {
        sequelize,
        tableName: "session_tokens",
        modelName: "SessionToken",
        timestamps: true,
        underscored: true,
      }
    );

    return SessionToken;
  }
}
