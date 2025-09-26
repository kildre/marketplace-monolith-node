jest.mock('../../../../rdbms/entities/Status', () => {
  class Status {
    static findOne = jest.fn();
  }
  return { Status };
});

import { Status } from '../../../../main/rdbms/entities/Status';
import { StatusDAO } from '../../../../main/rdbms/dao/StatusDAO';

describe('StatusDAO', () => {
  const dao = new StatusDAO();

  beforeEach(() => {
    (Status.findOne as any).mockReset?.();
  });

  test('findByCode', async () => {
    (Status.findOne as any).mockResolvedValue({ id: 1, code: 'APPROVED' });
    const s = await dao.findByCode('APPROVED');
    expect(Status.findOne).toHaveBeenCalledWith({ where: { code: 'APPROVED' } });
    expect(s).toEqual({ id: 1, code: 'APPROVED' });
  });
});
