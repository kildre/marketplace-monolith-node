import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('session_tokens', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    session_id: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      comment: 'Frontend session identifier; used instead of sending token each time.',
    },

    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Raw Keycloak access token (stored encrypted or plaintext per service settings).',
    },

    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional Keycloak refresh token.',
    },

    // Removed FK: Keycloak subject ID (UUID) does not match marketplace_user.email
    keycloak_user_id: {
      type: DataTypes.STRING(256),
      allowNull: true,
      comment: 'Keycloak subject ID (UUID). No FK: differs from marketplace_user.email.',
    },

    username: {
      type: DataTypes.STRING(256),
      allowNull: true,
      comment: 'Preferred username from Keycloak token.',
    },

    realm_roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      comment: 'Roles from Keycloak realm_access.roles',
    },

    resource_roles: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Roles from resource_access (client-specific roles).',
    },

    token_exp: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Token expiration timestamp derived from exp claim.',
    },

    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time the session/token was used.',
    },

    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Soft-revocation timestamp.',
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('session_tokens', ['session_id'], {
    name: 'session_tokens_session_id_idx',
    unique: true,
  });

  await queryInterface.addIndex('session_tokens', ['token_exp'], {
    name: 'session_tokens_token_exp_idx',
  });

  await queryInterface.addIndex('session_tokens', ['revoked_at'], {
    name: 'session_tokens_revoked_at_idx',
  });

  await queryInterface.addIndex('session_tokens', ['keycloak_user_id'], {
    name: 'session_tokens_keycloak_user_id_idx',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('session_tokens', 'session_tokens_keycloak_user_id_idx');
  await queryInterface.removeIndex('session_tokens', 'session_tokens_revoked_at_idx');
  await queryInterface.removeIndex('session_tokens', 'session_tokens_token_exp_idx');
  await queryInterface.removeIndex('session_tokens', 'session_tokens_session_id_idx');
  
  await queryInterface.dropTable('session_tokens');
}
