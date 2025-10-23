// src/test/int/service/userEndpointService.int.test.ts
import 'reflect-metadata';
import { Sequelize } from 'sequelize';
import { normalizeEmail, serializeError, seedRoles, createTestUser } from '../../utils/testHelpers';
import {
    PostgreSqlContainer,
    StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

describe('userEndpointService (integration)', () => {
    let container: StartedPostgreSqlContainer;
    let sequelize: Sequelize;
    let initDb: () => Promise<void>;
    let MarketplaceUser: any;
    let Role: any;
    let UserRole: any;

    const svcPath = '../../../main/service/userEndpointService';
    const RoleEnum = require('../../../main/domain/enumeration/RoleEnum').RoleEnum;

    // Use shared helpers for normalization and error serialization

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16').start();
        const pgUri = container.getConnectionUri();

        process.env.DB_DIALECT = 'postgres';
        process.env.DB_SSL = '0';
        process.env.SEQUELIZE_URL = pgUri;
        delete process.env['secret-env-postgresql'];
        delete process.env['SECRET_ENV_POSTGRESQL'];

        const entities = await import('../../../main/rdbms/entities');
        sequelize = entities.sequelize as Sequelize;
        initDb = entities.initDb as () => Promise<void>;

        await initDb();
        await sequelize.authenticate();
        await sequelize.drop();
        await sequelize.sync();

        // Get model references
        MarketplaceUser = sequelize.models.MarketplaceUser;
        Role = sequelize.models.Role;
        UserRole = sequelize.models.UserRole;

        // CRITICAL: Seed roles BEFORE any tests run
        await seedRoles(Role);

        // Verify roles were created
        const roleCount = await Role.count();
        if (roleCount === 0) {
            throw new Error('Failed to seed roles - no roles in database');
        }
    }, 120_000);

    afterAll(async () => {
        await sequelize?.close();
        await container?.stop();
    });

    beforeEach(async () => {
        // Clean test data in the correct order to avoid cascade issues
        try {
            // First, check how many roles exist BEFORE cleanup
            const roleCountBefore = await Role.count();
            // Step 1: Delete user-role associations first (this prevents cascade to roles)
            const userRolesDeleted = await UserRole.destroy({ where: {} });

            // Step 2: Delete users (now safe since no associations exist)
            const usersDeleted = await MarketplaceUser.destroy({ where: {} });

            // Check role count AFTER cleanup to ensure roles weren't affected
            const roleCountAfter = await Role.count();

            if (roleCountAfter === 0) {
                await seedRoles(Role);
            }
        } catch (err) {
            // rethrow so the test harness sees the failure
            throw err;
        }
    });

    // Use shared seedRoles helper

    // Use shared createTestUser helper

    it('isAuthorizedAdjudicator → true when user has ADJUDICATOR role', async () => {
        const testEmail = 'judge@example.com';
        await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.isAuthorizedAdjudicator({
            userEmail: testEmail
        });

        expect(res.hasRole).toBe(true);
    });

    it('isAuthorizedAdjudicator → false when user has REQUESTOR role', async () => {
        const testEmail = 'user@example.com';
        await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.isAuthorizedAdjudicator({
            userEmail: testEmail
        });

        expect(res.hasRole).toBe(false);
    });

    it('isAuthorizedAdjudicator → false when user does not exist', async () => {
        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.isAuthorizedAdjudicator({
            userEmail: 'nonexistent@example.com'
        });

        expect(res.hasRole).toBe(false);
    });

    it('isAuthorizedAdjudicator → service handles email normalization', async () => {
        const normalizedEmail = 'judge@example.com';
        const createdUser = await createTestUser(MarketplaceUser, Role, normalizedEmail, RoleEnum.ADJUDICATOR.id);

        // Verify the user and role association exist in DB
        const userRoles = await UserRole.findAll({ where: { userId: createdUser.id } });

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        // Query with non-normalized email
        const rawEmail = '  Judge@Example.COM  ';

        const res = await userEndpointService.isAuthorizedAdjudicator({
            userEmail: rawEmail
        });

        // If this fails, your service needs to normalize emails before calling DAO
        expect(res.hasRole).toBe(true);
    });

    it('isAuthorizedRequestor → true when user has REQUESTOR role', async () => {
        const testEmail = 'requestor@example.com';
        await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.isAuthorizedRequestor({
            userEmail: testEmail
        });

        expect(res.hasRole).toBe(true);
    });

    it('isAuthorizedRequestor → false when user has ADJUDICATOR role', async () => {
        const testEmail = 'adjudicator@example.com';
        await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.isAuthorizedRequestor({
            userEmail: testEmail
        });

        expect(res.hasRole).toBe(false);
    });

    it('findByEmail → throws when userEmail is missing/blank', async () => {
        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        await expect(
            userEndpointService.findByEmail({ userEmail: '   ' })
        ).rejects.toThrow(/userEmail is required/i);
    });

    it('findByEmail → returns user when found (normalizes input)', async () => {
        const testEmail = 'user@example.com';
        const createdUser = await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        // Query with different case and whitespace
        const res = await userEndpointService.findByEmail({
            userEmail: '  USER@EXAMPLE.com '
        });

        expect(res).toBeDefined();
        expect(res.id).toBe(createdUser.id);
        expect(res.email).toBe(normalizeEmail(testEmail));
    });

    it('findByEmail → throws when user not found', async () => {
        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        await expect(
            userEndpointService.findByEmail({ userEmail: 'missing@example.com' })
        ).rejects.toThrow(/User with email missing@example\.com not found/i);
    });

    it('findByEmail → finds user with exact email match', async () => {
        const testEmail = 'exact@example.com';
        const createdUser = await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const res = await userEndpointService.findByEmail({
            userEmail: testEmail
        });

        expect(res).toBeDefined();
        expect(res.id).toBe(createdUser.id);
    });

    // ===================== findIdByEmail =====================
    it('findIdByEmail → throws when userEmail is missing/blank', async () => {
        const mod = await import(svcPath);
        const userEndpointService = mod.default as any;

        await expect(
            userEndpointService.findIdByEmail({ userEmail: '   ' })
        ).rejects.toThrow(/userEmail is required\./i);
    });

    it('findIdByEmail → returns id when found (normalizes input)', async () => {
        const testEmail = 'user2@example.com';
        const createdUser = await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default as any;

        // Query with different case and whitespace
        const res = await userEndpointService.findIdByEmail({
            userEmail: '  USER2@EXAMPLE.com '
        });

        expect(typeof res).toBe('number');
        expect(res).toBe(createdUser.id);
    });

    it('findIdByEmail → throws when user not found', async () => {
        const mod = await import(svcPath);
        const userEndpointService = mod.default as any;

        await expect(
            userEndpointService.findIdByEmail({ userEmail: 'missing2@example.com' })
        ).rejects.toThrow(/User with email missing2@example\.com not found\./i);
    });

    it('multiple users → distinguishes different roles correctly', async () => {
        const adjudicatorEmail = 'adjudicator@example.com';
        const requestorEmail = 'requestor@example.com';

        await createTestUser(MarketplaceUser, Role, adjudicatorEmail, RoleEnum.ADJUDICATOR.id);
        await createTestUser(MarketplaceUser, Role, requestorEmail, RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const userEndpointService = mod.default;

        const adjudicatorCheck = await userEndpointService.isAuthorizedAdjudicator({
            userEmail: adjudicatorEmail
        });
        const requestorCheck = await userEndpointService.isAuthorizedRequestor({
            userEmail: requestorEmail
        });

        expect(adjudicatorCheck.hasRole).toBe(true);
        expect(requestorCheck.hasRole).toBe(true);

        // Cross-check: adjudicator shouldn't be requestor
        const adjudicatorAsRequestor = await userEndpointService.isAuthorizedRequestor({
            userEmail: adjudicatorEmail
        });
        expect(adjudicatorAsRequestor.hasRole).toBe(false);
    });

    it('DEBUG → verify data is inserted and readable', async () => {
        const testEmail = 'debug@example.com';

        // Check roles exist
        const roles = await Role.findAll();

        // Create user
        const created = await createTestUser(MarketplaceUser, Role, testEmail, RoleEnum.ADJUDICATOR.id);

        // Verify it's in the database
        const found = await MarketplaceUser.findOne({
            where: { email: normalizeEmail(testEmail) },
            include: [{ model: Role, as: 'roles' }] // Include roles to see the association
        });

        expect(found).toBeDefined();
        expect(found.email).toBe(normalizeEmail(testEmail));

        // Verify the role association exists in user_roles junction table
        const userRoleAssociation = await UserRole.findOne({
            where: { userId: found.id, roleId: RoleEnum.ADJUDICATOR.id }
        });
        expect(userRoleAssociation).toBeDefined();
        expect(userRoleAssociation.roleId).toBe(RoleEnum.ADJUDICATOR.id);
    });
});