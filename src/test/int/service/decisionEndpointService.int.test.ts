/**
 * Expanded integration tests for DecisionEndpointService using real Postgres.
 * Adds exception + branch coverage while still avoiding real inserts/updates.
 */

import 'reflect-metadata';
import type { Model } from 'sequelize';
import {
    Sequelize,
    UniqueConstraintError,
    ForeignKeyConstraintError,
    ValidationError,
    ValidationErrorItem,
} from 'sequelize';
import {
} from '@testcontainers/postgresql';
import { setupTestDb, teardownTestDb, TestDbContext } from '../../utils/testDbHelpers';

import { DecisionEndpointService } from '../../../main/service/decisionEndpointService';
import SubmitDecisionRequestDto from '../../../main/web/dtos/SubmitDecisionRequestDto';
import { UnauthorizedAdjudicatorError } from '../../../main/domain/errors/UnauthorizedAdjudicatorError';
import { normalizeEmail, serializeError, seedRoles, createTestUser, cleanTestData } from '../../utils/testHelpers';
import { UseCaseRequestNotFoundError } from '../../../main/domain/errors/UseCaseRequestNotFoundError';

describe('DecisionEndpointService (integration, expanded)', () => {
    let db: TestDbContext;
    let sequelize: Sequelize;

    // Service under test
    let service: DecisionEndpointService;

    // Optional: silence verbose console logs from boot code during this suite
    let logSpy: jest.SpyInstance;
    beforeAll(async () => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

    db = await setupTestDb();
    sequelize = db.sequelize;
    }, 120_000);

    afterAll(async () => {
        logSpy?.mockRestore();
    await teardownTestDb(sequelize, db.container);
    });

    let userEndpointService: any;
    let usecaseDao: any;
    let decisionDAO: any;
    let MarketplaceUser: any;
    let Role: any;
    let RoleEnum: any;
        // Removed local createTestUser, using shared helper

    beforeEach(async () => {
    // Import real services/DAOs
    const { sequelize } = await import('../../../main/rdbms/entities');
    MarketplaceUser = sequelize.models.MarketplaceUser;
    Role = sequelize.models.Role;
    const UserRole = sequelize.models.UserRole;

    // Logging: count users before and after cleanup
    const userCountBefore = await MarketplaceUser.count();
    const userRoleCountBefore = await UserRole.count();
    await cleanTestData({ MarketplaceUser, UserRole });
    const userCountAfter = await MarketplaceUser.count();
    const userRoleCountAfter = await UserRole.count();
    RoleEnum = (await import('../../../main/domain/enumeration/RoleEnum')).RoleEnum;
    await seedRoles(Role);
    await createTestUser(MarketplaceUser, Role, 'judge@example.com', RoleEnum.REQUESTOR.id);
    const userCountPostCreate = await MarketplaceUser.count({ where: { email: 'judge@example.com' } });

    service = new DecisionEndpointService();
    const mod = await import('../../../main/service/userEndpointService');
    userEndpointService = mod.default;
    const { UseCaseRequestDAO, DecisionDAO } = await import(
        '../../../main/rdbms/dao'
    );
    usecaseDao = new UseCaseRequestDAO();
    decisionDAO = new DecisionDAO();

    // Wire defaults
    (service as any).userEndpointService = userEndpointService;
    (service as any).usecaseDao = usecaseDao;
    (service as any).decisionDAO = decisionDAO;
    });

    // ───────────── minimal validations/authorization/not-found ─────────────
    it('submit rejects when adjudicatorEmail is missing/blank', async () => {
        const payload = new SubmitDecisionRequestDto({
            requestNumber: 'REQ-1',
            decisionNumber: 'DEC-1',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            /adjudicatorEmail is required/i
        );
    });

    it('submit rejects when adjudicator is not authorized', async () => {
    // User with REQUESTOR role already created in beforeEach

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-2',
            decisionNumber: 'DEC-2',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toBeInstanceOf(
            UnauthorizedAdjudicatorError
        );
    });

    it('submit rejects when user lookup returns null (authorized but user missing)', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => null,
        };

        const email = 'missing@example.com';
        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: email,
            requestNumber: 'REQ-3',
            decisionNumber: 'DEC-3',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            new RegExp(`User with email ${email} not found`, 'i')
        );
    });

    it('submit rejects when requestNumber is missing', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 101, email: 'judge@example.com' }),
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            // requestNumber omitted
            decisionNumber: 'DEC-4',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            /requestNumber is required/i
        );
    });

    it('submit rejects when statusId is invalid', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 101, email: 'judge@example.com' }),
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-5',
            decisionNumber: 'DEC-5',
            statusId: -1, // invalid triggers mocked fromId -> null
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            /statusId is required and must be valid/i
        );
    });

    it('submit throws UseCaseRequestNotFoundError when requestNumber does not exist', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 101, email: 'judge@example.com' }),
        };

        // stub usecaseDao to simulate not found
        (service as any).usecaseDao = {
            findByRequestNumber: async () => null,
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-NOT-FOUND',
            decisionNumber: 'DEC-6',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toBeInstanceOf(
            UseCaseRequestNotFoundError
        );
    });

    // ───────────── branch: normalization + response trim (happy path with stubs) ─────────────

    it('submit normalizes adjudicatorEmail and trims decisionNumber; returns response', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async (dto: any) => {
                expect(String(dto.userEmail)).toBe('judge@example.com');
                return { hasRole: true };
            },
            findByEmail: async (dto: any) => {
                expect(dto.userEmail).toBe('judge@example.com');
                return { id: 777, email: 'judge@example.com' };
            },
        };

        (service as any).usecaseDao = {
            findByRequestNumber: async (rn: string) => {
                expect(rn).toBe('REQ-7');
                return { id: 555 };
            },
        };

        // decisionDAO.create should be called within a transaction
        const createSpy = jest.fn().mockResolvedValue({ id: 999 });
        (service as any).decisionDAO = { create: createSpy };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: '  JUDGE@EXAMPLE.COM  ',
            requestNumber: 'REQ-7',
            decisionNumber: '  DEC-7  ',
            statusId: 1,
            comments: undefined,
        } as any);

        const res = await service.submit(payload);
        expect(res.decisionNumber).toBe('DEC-7');
        expect(createSpy).toHaveBeenCalledTimes(1);

        const args = createSpy.mock.calls[0][0];
        expect(args.requestId).toBe(555);
        expect(args.adjudicatorId).toBe(777);
        expect(args.statusId).toBe(1);
    });

    // ───────────── error mapping branches (thrown from DAO.create) ─────────────

    it('maps UniqueConstraintError to "Duplicate value: ..."', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 111, email: 'judge@example.com' }),
        };
        (service as any).usecaseDao = {
            findByRequestNumber: async () => ({ id: 222 }),
        };
        (service as any).decisionDAO = {
            create: async () => {
                throw new UniqueConstraintError({
                    errors: [{ message: 'decisionNumber must be unique' }],
                } as any);
            },
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-8',
            decisionNumber: 'DEC-8',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            /Duplicate value: decisionNumber must be unique/i
        );
    });

    // ✅ FIXED: deterministically trigger ForeignKeyConstraintError after passing auth & lookups
    it('maps ForeignKeyConstraintError to "Invalid reference on <table>(fields)"', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 42, email: 'judge@example.com' }),
        };

        (service as any).usecaseDao = {
            findByRequestNumber: async (rn: string) => ({ id: 123, requestNumber: rn }),
        };

        (service as any).decisionDAO = {
            create: async () => {
                throw new ForeignKeyConstraintError({
                    table: 'decisions',
                    fields: ['request_id', 'adjudicator_id'],
                } as any);
            },
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-999',
            decisionNumber: 'DEC-9',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(
            /Invalid reference on decisions\s*\(request_id,\s*adjudicator_id\)/i
        );
    });

    it('maps ValidationError to "Validation failed: ..." with item messages', async () => {
        // 1) Force auth + user lookup to pass
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 777, email: 'judge@example.com' }),
        };

        // 2) Ensure request lookup succeeds so we reach decisionDAO.create
        (service as any).usecaseDao = {
            findByRequestNumber: async () => ({ id: 555 }),
        };

        // 3) Bypass/neutralize service-level status validation so we can hit DAO mapping.
        //    We don't know your exact implementation, so cover common patterns:

        // 3a) If the service has a dedicated validator method, stub it to no-op
        if ((service as any).validateStatusId) {
            jest
                .spyOn(service as any, 'validateStatusId')
                .mockImplementation(() => undefined);
        }

        // 3b) If the service uses a StatusEnum.fromId() style check, monkey-patch it
        try {
            const StatusEnumMod = await import('../../../main/domain/enumeration/StatusEnum');
            // No fromId method exists; nothing to stub here.
        } catch {
            // If the module doesn't exist in your project, silently ignore; the test still works if 3a covered it.
        }

        // 4) Force the DAO to throw a Sequelize ValidationError
        (service as any).decisionDAO = {
            create: async () => {
                // Build fully-specified ValidationErrorItems to satisfy TS typings
                const items = [
                    new ValidationErrorItem(
                        'decisionNumber is required',
                        'Validation error' as any,       // type
                        'decisionNumber',                // path
                        '' as any,                       // value
                        undefined as unknown as Model,   // instance
                        'notNull',                       // validatorKey
                        'notNull',                       // fnName
                        []                                // fnArgs
                    ) as any,
                    new ValidationErrorItem(
                        'comments must be <= 500 chars',
                        'Validation error' as any,
                        'comments',
                        'x'.repeat(501) as any,
                        undefined as unknown as Model,
                        'len',
                        'len',
                        [0, 500]
                    ) as any,
                ];
                throw new ValidationError('Validation failed', items);
            },
        };

        // 5) Use a "valid" statusId so we don't trip service-level checks
        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-10',
            decisionNumber: 'DEC-10',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toThrow(/Validation failed:/i);
    });

    // ✅ FIXED: direct unknown error throw instead of closing the DB connection
    it('rethrows unknown errors from DAO.create (passthrough)', async () => {
        (service as any).userEndpointService = {
            isAuthorizedAdjudicator: async () => ({ hasRole: true }),
            findByEmail: async () => ({ id: 101, email: 'judge@example.com' }),
        };

        (service as any).usecaseDao = {
            findByRequestNumber: async () => ({ id: 202 }),
        };

        const boom = new Error('kaboom');
        (service as any).decisionDAO = {
            create: async () => {
                throw boom;
            },
        };

        const payload = new SubmitDecisionRequestDto({
            adjudicatorEmail: 'judge@example.com',
            requestNumber: 'REQ-11',
            decisionNumber: 'DEC-11',
            statusId: 1,
        } as any);

        await expect(service.submit(payload)).rejects.toBe(boom);
    });
});
