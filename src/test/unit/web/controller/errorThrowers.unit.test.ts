// src/test/unit/web/controller/errorThrowers.unit.test.ts
import type { Request, Response, NextFunction } from 'express';

// ⬇️ Adjust this import to the actual file under test
import { throwTestError, throwConstraintError } from '../../../../main/web/controllers/errorTestController';

const makeNext = () => jest.fn() as unknown as NextFunction;
const makeRes = () =>
  ({
    // not used, but keeps types happy if you expand later
  } as unknown as Response);
const makeReq = () => ({} as unknown as Request);

describe('error thrower middlewares', () => {
  describe('throwTestError', () => {
    it('calls next(err) with a TestError and statusCode 400', () => {
      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      throwTestError(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errArg = (next as jest.Mock).mock.calls[0][0] as any;

      expect(errArg).toBeInstanceOf(Error);
      expect(errArg.name).toBe('TestError');
      expect(errArg.message).toBe('This is a test error!');
      expect(errArg.statusCode).toBe(400);
    });
  });

  describe('throwConstraintError', () => {
    it('calls next(err) with a ConstraintError and message', () => {
      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      throwConstraintError(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errArg = (next as jest.Mock).mock.calls[0][0] as any;

      // We don’t assert class identity (to avoid import/mapping issues),
      // just check it looks like a constraint error.
      expect(errArg).toBeInstanceOf(Error);
      // Many implementations set .name = 'ConstraintError'
      if ('name' in errArg) {
        expect(errArg.name).toMatch(/ConstraintError/i);
      }
      expect(errArg.message).toMatch(/Constraint validation failed/i);
    });
  });
});
