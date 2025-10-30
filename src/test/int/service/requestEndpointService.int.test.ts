// src/test/int/service/requestEndpointService.int.test.ts
import 'reflect-metadata';
import { Sequelize } from 'sequelize';
import { setupTestDb, teardownTestDb, TestDbContext } from '../../utils/testDbHelpers';

// Real models via entities
const svcPath = '../../../main/service/requestEndpointService';
const { StatusEnum } = require('../../../main/domain/enumeration/StatusEnum');

describe('requestEndpointService (integration, real DB/DAOs) — no Role model', () => {
  let db: TestDbContext;
  let sequelize: Sequelize;

  // model refs
  let MarketplaceUser: any; // not strictly needed when we stub userEndpointService
  let Status: any;
  let Product: any;
  let UseCaseRequest: any;
  let CartItem: any;

  const normalizeEmail = (e: string) => String(e ?? '').trim().toLowerCase();

  beforeAll(async () => {
    db = await setupTestDb();
    sequelize = db.sequelize;

    // bind model refs
    MarketplaceUser = sequelize.models.MarketplaceUser;
    Status = sequelize.models.Status;
    Product = sequelize.models.Product;
    UseCaseRequest = sequelize.models.UseCaseRequest;
    CartItem = sequelize.models.CartItem;

    // seed immutable statuses
    await seedStatuses();
  }, 120_000);

  afterAll(async () => {
    await teardownTestDb(sequelize, db.container);
  });

  beforeEach(async () => {
    // Clean dynamic/test data; statuses remain
    await CartItem.destroy({ where: {} });
    await UseCaseRequest.destroy({ where: {} });
    await MarketplaceUser.destroy({ where: {} });
    await Product.destroy({ where: {} });

    // Ensure statuses exist
    if ((await Status.count()) === 0) {
      await seedStatuses();
    }
  });

  async function seedStatuses() {
    const rows = [
      { id: StatusEnum.PENDING.id, code: 'PENDING' },
      { id: StatusEnum.APPROVED.id, code: 'APPROVED' },
      { id: StatusEnum.DENIED.id, code: 'DENIED' },
    ];
    for (const r of rows) {
      // upsert-ish without relying on dialect upsert
      const found = await Status.findByPk(r.id);
      if (!found) await Status.create(r);
    }
  }

  async function createProduct(name: string) {
    return Product.create({ name });
  }

  /** Build a service instance and stub its userEndpointService for auth/lookup. */
  async function getServiceWithAuth(stub: Partial<{
    isAuthorizedRequestor: (dto: any) => Promise<{ hasRole: boolean }>;
    isAuthorizedAdjudicator: (dto: any) => Promise<{ hasRole: boolean }>;
    findByEmail: (dto: any) => Promise<typeof MarketplaceUser | null>;
  }> = {}) {
    const mod = await import(svcPath);
    const service = mod.default;

    // Create a default user in the database for tests
    const defaultEmail = 'default-test-user@example.com';
    let defaultUser = await MarketplaceUser.findOne({ where: { email: defaultEmail } });
    if (!defaultUser) {
      defaultUser = await MarketplaceUser.create({ email: defaultEmail });
    }

    // wire real DAOs (already inside service), just replace userEndpointService
    const defaultStub = {
      isAuthorizedRequestor: async () => ({ hasRole: false }),
      isAuthorizedAdjudicator: async () => ({ hasRole: false }),
      findByEmail: async (dto: any) => {
        const email = normalizeEmail(dto.userEmail ?? dto.email ?? '');
        // Check if user exists, if not create them
        let user = await MarketplaceUser.findOne({ where: { email } });
        if (!user) {
          user = await MarketplaceUser.create({ email });
        }
        return user; // Return the Sequelize model instance
      },
    };
    (service as any).userEndpointService = { ...defaultStub, ...stub };
    return service;
  }

  // -------- submit() --------

  it('submit → throws if UseCaseRequest.sequelize is missing (initDb not run)', async () => {
    const service = await getServiceWithAuth();

    // Store original sequelize instance
    const originalSequelize = UseCaseRequest.sequelize;
    try {
      // Unbind sequelize from UseCaseRequest
      (UseCaseRequest as any).sequelize = undefined;

      await expect(service.submit({
        requestorEmail: 'auth@example.com',
        requestNumber: 'REQ-NODB',
        requestedToolName: 'Tool',
        description: 'desc',
        cartItems: [],
      } as any)).rejects.toThrow(/UseCaseRequest model is not bound to a Sequelize instance/i);
    } finally {
      // Restore sequelize
      (UseCaseRequest as any).sequelize = originalSequelize;
    }
  });

  it('submit → rejects when requestorEmail is missing/blank/undefined/null', async () => {
    const service = await getServiceWithAuth();
    for (const requestorEmail of ['   ' as any, undefined as any, null as any]) {
      await expect(service.submit({
        requestorEmail,
        requestNumber: 'REQ-NOEMAIL',
        requestedToolName: 'ToolX',
        description: 'desc',
        cartItems: []
      } as any)).rejects.toThrow(/User email is required/i);
    }
  });

  it('submit → happy path returns trimmed requestNumber and persists data', async () => {
    // Arrange
    await createProduct('Prod A');
    await createProduct('Prod B');
    const service = await getServiceWithAuth();

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

    const row = await UseCaseRequest.findOne({ where: { requestNumber: 'REQ-OK' } });
    expect(row).toBeTruthy();
    if (row) expect(row.requestNumber).toBe('REQ-OK');
  });

  it('submit → ProductNotFoundError if any product missing', async () => {
    await createProduct('Prod OK');
    const service = await getServiceWithAuth();

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
    const service = await getServiceWithAuth();

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
    const service = await getServiceWithAuth();

    const res = await service.submit({
      requestorEmail: ' user2@EXAMPLE.com ',
      requestNumber: 'REQ-NO-CART',
      requestedToolName: 'Tool No Cart',
      description: 'no items'
      // cartItems omitted
    } as any);

    expect(res.requestNumber).toBe('REQ-NO-CART');
    const saved = await UseCaseRequest.findOne({ where: { requestNumber: 'REQ-NO-CART' } });
    expect(saved).toBeTruthy();
    const items = await CartItem.findAll({ where: { requestId: (saved as any).id } });
    expect(items.length).toBe(0);
  });

  it('submit → maps ORM validation errors (e.g., requestedToolName missing)', async () => {
    const service = await getServiceWithAuth();

    await expect(service.submit({
      requestorEmail: 'user3@example.com',
      requestNumber: 'REQ-BAD',
      // requestedToolName missing/undefined
      description: 'desc'
    } as any)).rejects.toThrow(/Validation failed:/i);
  });

  // -------- view*() validation --------

  it('viewPendingRequests → rejects when userEmail is undefined/null/empty', async () => {
    const service = await getServiceWithAuth();
    for (const userEmail of [undefined, null, '']) {
      await expect(service.viewPendingRequests({ userEmail } as any))
        .rejects.toThrow(/User email is required/i);
    }
  });

  it('viewAllRequests → rejects when userEmail is undefined', async () => {
    const service = await getServiceWithAuth();
    await expect(service.viewAllRequests({ userEmail: undefined } as any))
      .rejects.toThrow(/User email is required/i);
  });

  it('viewRequestsForRequestor → rejects when userEmail is undefined', async () => {
    const service = await getServiceWithAuth();
    await expect(service.viewRequestsForRequestor({ userEmail: undefined } as any))
      .rejects.toThrow(/User email is required/i);
  });

  it('viewRequestForRequestNumber → rejects when userEmail is undefined', async () => {
    const service = await getServiceWithAuth();
    await expect(service.viewRequestForRequestNumber({ userEmail: undefined, requestNumber: 'REQ-X' } as any))
      .rejects.toThrow(/User email is required/i);
  });

  // -------- view*() happy paths --------

  it('viewPendingRequests → sees pending requests', async () => {
    // Arrange: products + submit two pending requests
    await createProduct('P1');
    await createProduct('P2');

    const service = await getServiceWithAuth();

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

  it('viewPendingRequests → with no pending returns empty list', async () => {
    const service = await getServiceWithAuth();
    const out = await service.viewPendingRequests({ userEmail: 'judge@example.com' } as any);
    expect(out.requests).toEqual([]);
  });

  it('viewAllRequests → with no data returns empty list', async () => {
    const service = await getServiceWithAuth();
    const out = await service.viewAllRequests({ userEmail: 'judge2@example.com' } as any);
    expect(out.requests).toEqual([]);
  });

  it('viewAllRequests → gets mapped list', async () => {
    await createProduct('X');

    const service = await getServiceWithAuth();

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

  it('viewRequestsForRequestor → sees own requests', async () => {
    await createProduct('R');

    const service = await getServiceWithAuth();

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

  it('viewRequestsForRequestor → with no requests returns empty list', async () => {
    const service = await getServiceWithAuth();
    const out = await service.viewRequestsForRequestor({ userEmail: '  EMPTY@EXAMPLE.COM  ' } as any);
    expect(out.requests).toEqual([]);
  });

  // -------- viewRequestForRequestNumber --------

  it('viewRequestForRequestNumber → request not found', async () => {
    const service = await getServiceWithAuth();

    await expect(service.viewRequestForRequestNumber({ userEmail: 'judge@example.com', requestNumber: 'REQ-404' } as any))
      .rejects.toThrow(/Request with number REQ-404 not found/i);
  });

  it('viewRequestForRequestNumber → found returns mapped dto', async () => {
    await createProduct('PX');

    const service = await getServiceWithAuth();

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

  it('viewPendingRequests → email normalization works', async () => {
    await createProduct('NP');

    const service = await getServiceWithAuth();

    await service.submit({
      requestorEmail: 'reqnorm@example.com',
      requestNumber: 'REQ-NORM',
      requestedToolName: 'Tool N',
      description: 'd',
      cartItems: [{ name: 'NP', quantity: 1 }]
    } as any);

    const out = await service.viewPendingRequests({ userEmail: '  JUDGE.NORM@EXAMPLE.COM  ' } as any);
    expect(out.requests.some((r: any) => r.requestNumber === 'REQ-NORM')).toBe(true);
  });
});
