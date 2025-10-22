// src/test/int/service/requestEndpointService.int.test.ts
import 'reflect-metadata';
import { Sequelize } from 'sequelize';
import { normalizeEmail, seedRoles, createTestUser } from '../../utils/testHelpers';
import {
} from '@testcontainers/postgresql';
import { setupTestDb, teardownTestDb, TestDbContext } from '../../utils/testDbHelpers';

// We'll exercise the real service + DAOs (no mocks), mirroring userEndpointService integration style

describe('requestEndpointService (integration, real DB/DAOs)', () => {
    let db: TestDbContext;
    let sequelize: Sequelize;

    // model refs
    let MarketplaceUser: any;
    let Role: any;
    let UserRole: any;
    let Status: any;
    let Product: any;
    let UseCaseRequest: any;
    let CartItem: any;

    const svcPath = '../../../main/service/requestEndpointService';
    const { RoleEnum } = require('../../../main/domain/enumeration/RoleEnum');
    const { StatusEnum } = require('../../../main/domain/enumeration/StatusEnum');

    const normalizeEmail = (e: string) => e.trim().toLowerCase();

    beforeAll(async () => {
        db = await setupTestDb();
        sequelize = db.sequelize;
        // bind model refs
        MarketplaceUser = sequelize.models.MarketplaceUser;
        Role = sequelize.models.Role;
        UserRole = sequelize.models.UserRole;
        Status = sequelize.models.Status;
        Product = sequelize.models.Product;
        UseCaseRequest = sequelize.models.UseCaseRequest;
        CartItem = sequelize.models.CartItem;
        // seed immutable tables: roles + statuses
        await seedRoles();
        await seedStatuses();
    }, 120_000);

    afterAll(async () => {
        await teardownTestDb(sequelize, db.container);
    });

    beforeEach(async () => {
        // Clean dynamic/test data while keeping roles/statuses
        // Order matters due to foreign keys
        // Check role count before cleanup
        const roleCountBefore = await Role.count();
        await CartItem.destroy({ where: {} });
        await UseCaseRequest.destroy({ where: {} });
        await UserRole.destroy({ where: {} });
        await MarketplaceUser.destroy({ where: {} });

        // Products can be re-seeded per test for predictability
        await Product.destroy({ where: {} });

        // Check role count after cleanup to ensure roles weren't affected
        const roleCountAfter = await Role.count();

        if (roleCountAfter === 0) {
            await seedRoles();
        }

        // Check status count after cleanup
        const statusCountAfter = await Status.count();
        if (statusCountAfter === 0) {
            await seedStatuses();
        }
    });

    async function seedRoles() {
        try {
            await Role.bulkCreate([
                { id: RoleEnum.ADJUDICATOR.id, name: 'ADJUDICATOR' },
                { id: RoleEnum.REQUESTOR.id, name: 'REQUESTOR' },
            ], { ignoreDuplicates: true, validate: true });
        } catch (error) {
            //console.error('seedRoles: bulkCreate failed, trying individual creates:', error);

            await Role.create({ id: RoleEnum.ADJUDICATOR.id, name: 'ADJUDICATOR' });
            await Role.create({ id: RoleEnum.REQUESTOR.id, name: 'REQUESTOR' });
        }

        // Verify roles exist
        const adjudicatorRole = await Role.findByPk(RoleEnum.ADJUDICATOR.id);
        const requestorRole = await Role.findByPk(RoleEnum.REQUESTOR.id);

        if (!adjudicatorRole || !requestorRole) {
            throw new Error('Failed to seed required roles');
        }
    }

    async function seedStatuses() {
        try {
            await Status.bulkCreate([
                { id: StatusEnum.PENDING.id, code: 'PENDING' },
                { id: StatusEnum.APPROVED.id, code: 'APPROVED' },
                { id: StatusEnum.DENIED.id, code: 'DENIED' },
            ], { ignoreDuplicates: true, validate: true });
        } catch (error) {
            await Status.create({ id: StatusEnum.PENDING.id, code: 'PENDING' });
            await Status.create({ id: StatusEnum.APPROVED.id, code: 'APPROVED' });
            await Status.create({ id: StatusEnum.DENIED.id, code: 'DENIED' });
        }

        // Verify statuses exist
        const pendingStatus = await Status.findByPk(StatusEnum.PENDING.id);
        const approvedStatus = await Status.findByPk(StatusEnum.APPROVED.id);
        const deniedStatus = await Status.findByPk(StatusEnum.DENIED.id);
        if (!pendingStatus || !approvedStatus || !deniedStatus) {
            throw new Error('Failed to seed required statuses');
        }
    }

    async function createUserWithRole(email: string, roleId: number) {
        const user = await MarketplaceUser.create({ email: normalizeEmail(email) });
        const role = await Role.findByPk(roleId);
        if (!role) throw new Error(`Role id=${roleId} missing`);
        await (user as any).addRole(role);
        return user;
    }

    async function createProduct(name: string) {
        return Product.create({ name });
    }

    // -------- submit() --------

    it('submit → rejects when requestor unauthorized', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: 'user@example.com',
            requestNumber: 'REQ-UNAUTH',
            requestedToolName: 'ToolX',
            description: 'desc',
            cartItems: [],
        } as any)).rejects.toThrow(/does not correspond to an authorized requestor/i);
    });

    it('submit → throws if UseCaseRequest.sequelize is missing (initDb not run)', async () => {
        // Create a valid authorized requestor
        await createUserWithRole('auth@example.com', RoleEnum.REQUESTOR.id);
        const mod = await import(svcPath);
        const service = mod.default;

        // Store original sequelize instance
        const originalSequelize = UseCaseRequest.sequelize;

        try {
            // Unbind sequelize from UseCaseRequest
            UseCaseRequest.sequelize = undefined;

            await expect(service.submit({
                requestorEmail: 'auth@example.com',
                requestNumber: 'REQ-NODB',
                requestedToolName: 'Tool',
                description: 'desc',
                cartItems: [],
            } as any)).rejects.toThrow(/UseCaseRequest model is not bound to a Sequelize instance/i);
        } finally {
            // Always restore sequelize, even if test fails
            UseCaseRequest.sequelize = originalSequelize;
        }
    });

    it('submit → rejects when requestorEmail is missing/blank', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: '   ' as any,
            requestNumber: 'REQ-NOEMAIL',
            requestedToolName: 'ToolX',
            description: 'desc',
            cartItems: []
        } as any)).rejects.toThrow(/requestorEmail is required/i);
    });

    it('submit → rejects when requestorEmail is undefined', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: undefined as any,
            requestNumber: 'REQ-UNDEF',
            requestedToolName: 'ToolX',
            description: 'desc',
            cartItems: []
        } as any)).rejects.toThrow(/requestorEmail is required/i);
    });

    it('submit → rejects when requestorEmail is null', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: null as any,
            requestNumber: 'REQ-NULL',
            requestedToolName: 'ToolX',
            description: 'desc',
            cartItems: []
        } as any)).rejects.toThrow(/requestorEmail is required/i);
    });

    it('submit → happy path returns trimmed requestNumber and persists data', async () => {
        // Arrange
        await createProduct('Prod A');
        await createProduct('Prod B');
        await createUserWithRole('user@example.com', RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        // Act
        const res = await service.submit({
            requestorEmail: '  USER@EXAMPLE.COM  ',
            requestNumber: '  REQ-OK  ',
            requestedToolName: 'ToolA',
            description: 'desc',
            cartItems: [
                { name: 'Prod A', quantity: 2 },
                { name: 'Prod B', quantity: 1 },
            ],
        } as any);

        // Assert
        expect(res.requestNumber).toBe('REQ-OK');

        // Check how many requests exist
        const allRequests = await UseCaseRequest.findAll();

        const row = await UseCaseRequest.findOne({ where: { requestNumber: 'REQ-OK' } });
        expect(row).toBeTruthy();
        if (row) {
            expect(row.requestNumber).toBe('REQ-OK');
        }
    });

    it('submit → ProductNotFoundError if any product missing', async () => {
        await createProduct('Prod OK');
        await createUserWithRole('user@example.com', RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: 'user@example.com',
            requestNumber: 'REQ-NOPROD',
            requestedToolName: 'ToolZ',
            description: 'desc',
            cartItems: [
                { name: 'Prod OK', quantity: 1 },
                { name: 'Missing One', quantity: 1 },
            ],
        } as any)).rejects.toThrow(/Product not found:\s*Missing One/i);
    });

    it('submit → maps unique constraint to a duplicate error message', async () => {
        await createProduct('One');
        await createUserWithRole('req@example.com', RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        // first submit OK
        await service.submit({
            requestorEmail: 'req@example.com',
            requestNumber: 'REQ-DUP',
            requestedToolName: 'Tool',
            description: 'd',
            cartItems: [],
        } as any);

        // second submit with same requestNumber should fail
        await expect(service.submit({
            requestorEmail: 'req@example.com',
            requestNumber: 'REQ-DUP',
            requestedToolName: 'Tool',
            description: 'd',
            cartItems: [],
        } as any)).rejects.toThrow(/Duplicate value/i);
    });

    it('submit → succeeds when cartItems is omitted (undefined)', async () => {
        await createUserWithRole('user2@example.com', RoleEnum.REQUESTOR.id);
        const mod = await import(svcPath);
        const service = mod.default;

        const res = await service.submit({
            requestorEmail: ' user2@EXAMPLE.com ',
            requestNumber: 'REQ-NO-CART',
            requestedToolName: 'Tool No Cart',
            description: 'no items'
            // cartItems omitted on purpose
        } as any);

        expect(res.requestNumber).toBe('REQ-NO-CART');
        const saved = await UseCaseRequest.findOne({ where: { requestNumber: 'REQ-NO-CART' } });
        expect(saved).toBeTruthy();
        const items = await CartItem.findAll({ where: { requestId: saved.id } });
        expect(items.length).toBe(0);
    });

    it('submit → maps ORM validation errors (e.g., requestedToolName missing)', async () => {
        await createUserWithRole('user3@example.com', RoleEnum.REQUESTOR.id);
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.submit({
            requestorEmail: 'user3@example.com',
            requestNumber: 'REQ-BAD',
            // requestedToolName missing/undefined
            description: 'desc'
        } as any)).rejects.toThrow(/Validation failed:/i);
    });

    // -------- view*() authorization --------

    it('viewPendingRequests → unauthorized adjudicator', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewPendingRequests({ userEmail: 'judge@example.com' } as any))
            .rejects.toThrow(/does not correspond to an authorized/i);
    });

    it('viewPendingRequests → rejects when userEmail is undefined', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewPendingRequests({ userEmail: undefined } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    it('viewPendingRequests → rejects when userEmail is null', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewPendingRequests({ userEmail: null } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    it('viewPendingRequests → rejects when userEmail is empty string', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewPendingRequests({ userEmail: '' } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    it('viewAllRequests → unauthorized adjudicator', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewAllRequests({ userEmail: 'judge@example.com' } as any))
            .rejects.toThrow(/does not correspond to an authorized/i);
    });

    it('viewAllRequests → rejects when userEmail is undefined', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewAllRequests({ userEmail: undefined } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    it('viewRequestsForRequestor → unauthorized requestor', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewRequestsForRequestor({ userEmail: 'user@example.com' } as any))
            .rejects.toThrow(/does not correspond to an authorized requestor/i);
    });

    it('viewRequestsForRequestor → rejects when userEmail is undefined', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewRequestsForRequestor({ userEmail: undefined } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    it('viewRequestForRequestNumber → rejects when userEmail is undefined', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewRequestForRequestNumber({ userEmail: undefined, requestNumber: 'REQ-X' } as any))
            .rejects.toThrow(/Constraint validation failed/i);
    });

    // -------- view*() happy paths --------

    it('viewPendingRequests → authorized adjudicator sees pending requests', async () => {
        // Arrange
        await createProduct('P1');
        await createProduct('P2');
        await createUserWithRole('requestor@example.com', RoleEnum.REQUESTOR.id);
        await createTestUser(MarketplaceUser, Role, 'judge@example.com', RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        // Seed two pending requests via submit
        await service.submit({
            requestorEmail: 'requestor@example.com',
            requestNumber: 'REQ-A',
            requestedToolName: 'Tool A',
            description: 'd1',
            cartItems: [{ name: 'P1', quantity: 2 }],
        } as any);
        await service.submit({
            requestorEmail: 'requestor@example.com',
            requestNumber: 'REQ-B',
            requestedToolName: 'Tool B',
            description: 'd2',
            cartItems: [{ name: 'P2', quantity: 1 }],
        } as any);

        // Act
        const out = await service.viewPendingRequests({ userEmail: 'judge@example.com' } as any);

        // Assert
        expect(out.requests.length).toBeGreaterThanOrEqual(2);
        expect(out.requests[0]).toEqual(expect.objectContaining({
            requestNumber: expect.any(String),
            requestedToolName: expect.any(String),
            requestorEmail: 'requestor@example.com',
        }));
    });

    it('viewPendingRequests → authorized adjudicator with no pending returns empty list', async () => {
        await createUserWithRole('judge@example.com', RoleEnum.ADJUDICATOR.id);
        const mod = await import(svcPath);
        const service = mod.default;
        const out = await service.viewPendingRequests({ userEmail: 'judge@example.com' } as any);
        expect(out.requests).toEqual([]);
    });

    it('viewAllRequests → authorized adjudicator with no data returns empty list', async () => {
        await createUserWithRole('judge2@example.com', RoleEnum.ADJUDICATOR.id);
        const mod = await import(svcPath);
        const service = mod.default;
        const out = await service.viewAllRequests({ userEmail: 'judge2@example.com' } as any);
        expect(out.requests).toEqual([]);
    });

    it('viewAllRequests → authorized adjudicator gets mapped list', async () => {
        await createProduct('X');
        await createUserWithRole('r@example.com', RoleEnum.REQUESTOR.id);
        await createUserWithRole('judge@example.com', RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        await service.submit({
            requestorEmail: 'r@example.com',
            requestNumber: 'REQ-Z',
            requestedToolName: 'Tool Z',
            description: 'dz',
            cartItems: [{ name: 'X', quantity: 1 }],
        } as any);

        const res = await service.viewAllRequests({ userEmail: 'judge@example.com' } as any);
        expect(res.requests[0]).toEqual(expect.objectContaining({
            requestNumber: 'REQ-Z',
            requestedToolName: 'Tool Z',
            requestorEmail: 'r@example.com',
        }));
    });

    it('viewRequestsForRequestor → authorized requestor sees own requests', async () => {
        await createProduct('R');
        await createUserWithRole('me@example.com', RoleEnum.REQUESTOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        await service.submit({
            requestorEmail: 'ME@EXAMPLE.COM',
            requestNumber: 'REQ-R',
            requestedToolName: 'Tool R',
            description: 'rr',
            cartItems: [{ name: 'R', quantity: 1 }],
        } as any);

        const out = await service.viewRequestsForRequestor({ userEmail: 'me@example.com' } as any);
        expect(out.requests[0]).toEqual(expect.objectContaining({
            requestNumber: 'REQ-R',
            requestedToolName: 'Tool R',
            requestorEmail: 'me@example.com',
            cartItems: [{ name: 'R', quantity: 1 }],
        }));
    });

    it('viewRequestsForRequestor → authorized requestor with no requests returns empty list', async () => {
        await createUserWithRole('empty@example.com', RoleEnum.REQUESTOR.id);
        const mod = await import(svcPath);
        const service = mod.default;
        const out = await service.viewRequestsForRequestor({ userEmail: '  EMPTY@EXAMPLE.COM  ' } as any);
        expect(out.requests).toEqual([]);
    });

    // -------- viewRequestForRequestNumber --------

    it('viewRequestForRequestNumber → unauthorized adjudicator', async () => {
        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewRequestForRequestNumber({ userEmail: 'nope@example.com', requestNumber: 'REQ-404' } as any))
            .rejects.toThrow(/does not correspond to an authorized/i);
    });

    it('viewRequestForRequestNumber → authorized but not found', async () => {
        await createUserWithRole('judge@example.com', RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        await expect(service.viewRequestForRequestNumber({ userEmail: 'judge@example.com', requestNumber: 'REQ-404' } as any))
            .rejects.toThrow(/Request with number REQ-404 not found/i);
    });

    it('viewRequestForRequestNumber → authorized + found returns mapped dto', async () => {
        await createProduct('PX');
        await createUserWithRole('r@example.com', RoleEnum.REQUESTOR.id);
        await createUserWithRole('judge@example.com', RoleEnum.ADJUDICATOR.id);

        const mod = await import(svcPath);
        const service = mod.default;

        await service.submit({
            requestorEmail: 'r@example.com',
            requestNumber: 'REQ-ONE',
            requestedToolName: 'Tool One',
            description: 'd',
            cartItems: [{ name: 'PX', quantity: 5 }],
        } as any);

        const dto = await service.viewRequestForRequestNumber({ userEmail: 'judge@example.com', requestNumber: 'REQ-ONE' } as any);

        expect(dto).toEqual(expect.objectContaining({
            requestNumber: 'REQ-ONE',
            requestedToolName: 'Tool One',
            requestorEmail: 'r@example.com',
            cartItems: [{ name: 'PX', quantity: 5 }],
        }));
    });

    it('viewPendingRequests → adjudicator email normalization works', async () => {
        // Arrange
        await createProduct('NP');
        await createTestUser(MarketplaceUser, Role, 'reqnorm@example.com', RoleEnum.REQUESTOR.id);
        await createTestUser(MarketplaceUser, Role, 'judge.norm@example.com', RoleEnum.ADJUDICATOR.id);
        const mod = await import(svcPath);
        const service = mod.default;
        await service.submit({
            requestorEmail: 'reqnorm@example.com',
            requestNumber: 'REQ-NORM',
            requestedToolName: 'Tool N',
            description: 'd',
            cartItems: [{ name: 'NP', quantity: 1 }]
        } as any);

        // Act
        const out = await service.viewPendingRequests({ userEmail: '  JUDGE.NORM@EXAMPLE.COM  ' } as any);
        expect(out.requests.some(r => r.requestNumber === 'REQ-NORM')).toBe(true);
    });
});
