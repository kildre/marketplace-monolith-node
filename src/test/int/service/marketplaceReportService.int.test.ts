/**
 * Minimal integration tests for MarketplaceReportService.getSummary()
 * - Real Postgres via @testcontainers/postgresql
 * - Imports central entities index (wires all models/associations)
 * - No data inserts/updates, and no explicit transactions
 */

import 'reflect-metadata';
import { Sequelize } from 'sequelize';
import {
} from '@testcontainers/postgresql';
import { setupTestDb, teardownTestDb, TestDbContext } from '../../utils/testDbHelpers';

import { MarketplaceReportService } from '../../../main/service/marketplaceReportService';

describe('MarketplaceReportService.getSummary (integration, minimal)', () => {
  let db: TestDbContext;
  let sequelize: Sequelize;
  const service = new MarketplaceReportService();

  beforeAll(async () => {
  db = await setupTestDb();
  sequelize = db.sequelize;
  jest.resetModules();
  }, 120_000);

  afterAll(async () => {
  await teardownTestDb(sequelize, db.container);
  });

  // No beforeEach: we never insert or mutate data in these tests

  it('returns zeros on an empty database (default singleQuery=true, managed tx)', async () => {
    const summary = await service.getSummary();
    expect(summary).toEqual({ totalUsers: 0, totalUseCases: 0, totalOrders: 0 });
  });

  it('singleQuery=false returns the same zeros on an empty database', async () => {
    const sTrue = await service.getSummary({ singleQuery: true });
    const sFalse = await service.getSummary({ singleQuery: false });
    expect(sFalse).toEqual(sTrue);
    expect(sFalse).toEqual({ totalUsers: 0, totalUseCases: 0, totalOrders: 0 });
  });
});
