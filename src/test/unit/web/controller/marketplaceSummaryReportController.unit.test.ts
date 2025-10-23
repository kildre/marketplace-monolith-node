import type { Request, Response, NextFunction } from 'express';

/** 1) Mock the EXACT path your controller imports */
jest.mock('../../../../main/service/marketplaceReportService', () => {
  const getSummary = jest.fn();
  return {
    __esModule: true,
    MarketplaceReportService: jest.fn().mockImplementation(() => ({
      getSummary,
    })),
  };
});

/** 2) Import SUT AFTER the mock so it uses the mocked class instance */
import controller from '../../../../main/web/controllers/marketplaceReportController';
import { MarketplaceReportService } from '../../../../main/service/marketplaceReportService';

type MockSvc = { getSummary: jest.Mock };
const MockCtor = MarketplaceReportService as unknown as jest.Mock;

let svc: MockSvc;

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

const makeNext = () => jest.fn() as unknown as NextFunction;

beforeAll(() => {
  // Cache the single instance constructed at module load by the controller
  svc = (MockCtor.mock.results[0]?.value || MockCtor.mock.instances[0]) as MockSvc;
  if (!svc) {
    throw new Error(
      'Mock MarketplaceReportService was not instantiated. Ensure jest.mock path matches controller import.'
    );
  }
});

afterEach(() => {
  // Only reset method mocks — don't clear constructor history
  svc.getSummary.mockReset();
});

describe('MarketplaceSummaryReportController.report', () => {
  it('returns 200 and JSON summary on success', async () => {
    const res = makeRes();
    const next = makeNext();

    const summary = { totalRequests: 12, pending: 3, approved: 8, rejected: 1 };
    svc.getSummary.mockResolvedValueOnce(summary);

    await controller.report({} as Request, res, next);

    expect(svc.getSummary).toHaveBeenCalledTimes(1);
    expect(svc.getSummary).toHaveBeenCalledWith(); // no args

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(summary);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when service throws', async () => {
    const res = makeRes();
    const next = makeNext();

    const err = new Error('boom');
    svc.getSummary.mockRejectedValueOnce(err);

    await controller.report({} as Request, res, next);

    expect(svc.getSummary).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
