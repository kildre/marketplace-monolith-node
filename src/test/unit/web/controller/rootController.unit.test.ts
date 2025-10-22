// src/test/unit/web/controller/rootController.unit.test.ts
import path from 'path';
import type { Response } from 'express';

// ✅ Mock the EXACT module your controller imports
jest.mock('../../../../main/service/loggingService', () => ({
  __esModule: true,
  default: { info: jest.fn() },
}));

// Now import the SUT (after the mock)
import { renderIndex } from '../../../../main/web/controllers/rootController';
import log from '../../../../main/service/loggingService';

describe('renderIndex', () => {
  it('logs once, sends /public/index.html, and returns res', () => {
    // Arrange
    const res = { sendFile: jest.fn() } as unknown as Response;

    // Act
    const returned = renderIndex({} as any, res);

    // Assert: logging
    expect((log as any).info).toHaveBeenCalledTimes(1);
    expect((log as any).info).toHaveBeenCalledWith('Rendering index ...');

    // Assert: sendFile path
    expect(res.sendFile).toHaveBeenCalledTimes(1);
    const sent = (res.sendFile as jest.Mock).mock.calls[0][0];
    expect(typeof sent).toBe('string');
    expect(path.isAbsolute(sent)).toBe(true);
    const norm = sent.split(path.sep).join('/');
    expect(norm.endsWith('/public/index.html')).toBe(true);

    // Assert: returns res
    expect(returned).toBe(res);
  });
});
