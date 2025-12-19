import { BaseDAO } from '../../../../main/rdbms/dao/BaseDAO';
import { Model } from 'sequelize';

// Minimal mock model with the static methods BaseDAO uses
class DummyModel extends Model {
  static create = jest.fn();
  static findByPk = jest.fn();
  static findAll = jest.fn();
}

class DummyDAO extends BaseDAO<any> {
  constructor() {
    super(DummyModel as any);
  }
}

describe('BaseDAO', () => {
  let dao: DummyDAO;

  beforeEach(() => {
    dao = new DummyDAO();
    (DummyModel.create as any).mockReset?.();
    (DummyModel.findByPk as any).mockReset?.();
    (DummyModel.findAll as any).mockReset?.();
  });

  test('create calls Model.create', async () => {
    (DummyModel.create as any).mockResolvedValue({ id: 1, name: 'A' });
    const result = await dao.create({ name: 'A' } as any);
    expect(DummyModel.create).toHaveBeenCalledWith({ name: 'A' }, { transaction: undefined });
    expect(result).toEqual({ id: 1, name: 'A' });
  });

  test('findById calls Model.findByPk', async () => {
    (DummyModel.findByPk as any).mockResolvedValue({ id: 1, name: 'A' });
    const result = await dao.findById(1);
    expect(DummyModel.findByPk).toHaveBeenCalledWith(1, undefined);
    expect(result).toEqual({ id: 1, name: 'A' });
  });

  test('findAll calls Model.findAll', async () => {
    (DummyModel.findAll as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const result = await dao.findAll();
    expect(DummyModel.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  test('updateById updates when found', async () => {
    const instance: any = { update: jest.fn().mockResolvedValue(null) };
    (DummyModel.findByPk as any).mockResolvedValue(instance);
    const result = await dao.updateById(3, { name: 'B' } as any);
    expect(DummyModel.findByPk).toHaveBeenCalledWith(3, { transaction: undefined });
    expect(instance.update).toHaveBeenCalledWith({ name: 'B' }, { transaction: undefined });
    expect(result).toBe(instance);
  });

  test('updateById returns null if not found', async () => {
    (DummyModel.findByPk as any).mockResolvedValue(null);
    const result = await dao.updateById(99, { name: 'X' } as any);
    expect(result).toBeNull();
  });

  test('deleteById destroys when found', async () => {
    const instance: any = { destroy: jest.fn().mockResolvedValue(null) };
    (DummyModel.findByPk as any).mockResolvedValue(instance);

    const ok = await dao.deleteById(5);

    expect(instance.destroy).toHaveBeenCalledWith({
      transaction: undefined,
      force: false,
    });
    expect(ok).toBe(true);
  });

  test('deleteById returns false when not found', async () => {
    (DummyModel.findByPk as any).mockResolvedValue(null);
    const ok = await dao.deleteById(404);
    expect(ok).toBe(false);
  });

  test('deleteById hard deletes when hard:true', async () => {
    const instance: any = { destroy: jest.fn().mockResolvedValue(null) };
    (DummyModel.findByPk as any).mockResolvedValue(instance);
    const ok = await dao.deleteById(5, { hard: true });
    expect(instance.destroy).toHaveBeenCalledWith({ force: true, transaction: undefined });
    expect(ok).toBe(true);
  });
});
