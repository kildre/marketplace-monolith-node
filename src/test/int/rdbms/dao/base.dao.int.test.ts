// src/test/int/rdbms/dao/base.dao.int.test.ts
import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, Transaction } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { BaseDAO } from '../../../../main/rdbms/dao/BaseDAO';

class Thing extends Model<InferAttributes<Thing>, InferCreationAttributes<Thing>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date> | null;

  static initModel(sequelize: Sequelize) {
    Thing.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(128), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
        updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
        deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
      },
      {
        sequelize,
        tableName: 'thing',
        underscored: true,
        timestamps: true,
        paranoid: true, // enables soft delete using deleted_at
      }
    );
  }
}

/** Expose protected helpers for testing */
class ThingDAO extends BaseDAO<Thing> {
  constructor() { super(Thing); }
  // expose withManagedTx for testing the managed-transaction helper
  public runWithManagedTx<T>(fn: (tx: Transaction) => Promise<T>, tx?: Transaction) {
    return this.withManagedTx(fn, tx);
  }
  // expose access to protected sequelize getter to test the error path
  public pingSequelize() {
    return this.sequelize; // returns Sequelize or throws if model not bound
  }
}

describe('BaseDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let dao: ThingDAO;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    Thing.initModel(sequelize);
    await sequelize.sync({ force: true });

    dao = new ThingDAO();
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  beforeEach(async () => {
    await Thing.destroy({ where: {} as any, force: true }); // hard wipe for clean slate
  });

  it('create() + findById() + findAll()', async () => {
    const a = await dao.create({ name: 'alpha' } as any);
    const b = await dao.create({ name: 'beta' } as any);

    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();

    const gotA = await dao.findById(a.id);
    expect(gotA?.name).toBe('alpha');

    const list = await dao.findAll({ order: [['id', 'ASC']] });
    expect(list.map(x => x.name)).toEqual(['alpha', 'beta']);
  });

  it('updateById() updates existing and returns instance; returns null when not found', async () => {
    const row = await dao.create({ name: 'before' } as any);

    const updated = await dao.updateById(row.id, { name: 'after' } as any);
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('after');

    const missing = await dao.updateById(999999, { name: 'x' } as any);
    expect(missing).toBeNull();
  });

  it('deleteById() soft-deletes by default (paranoid), and hard-deletes with {hard:true}', async () => {
    const soft = await dao.create({ name: 'softy' } as any);
    const hard = await dao.create({ name: 'hardy' } as any);

    // soft delete
    const okSoft = await dao.deleteById(soft.id);
    expect(okSoft).toBe(true);

    // soft-deleted rows are invisible to normal finds (paranoid true)
    const softFoundDefault = await dao.findById(soft.id);
    expect(softFoundDefault).toBeNull();

    // But still present if we query with paranoid:false using the model directly
    const softFoundAll = await Thing.findByPk(soft.id, { paranoid: false });
    expect(softFoundAll).not.toBeNull();
    expect(softFoundAll!.deletedAt).not.toBeNull();

    // hard delete
    const okHard = await dao.deleteById(hard.id, { hard: true });
    expect(okHard).toBe(true);

    // Even with paranoid:false, a hard-deleted row is gone
    const hardFound = await Thing.findByPk(hard.id, { paranoid: false });
    expect(hardFound).toBeNull();
  });

  it('respects provided transaction (commit vs rollback)', async () => {
    // COMMIT path
    await sequelize.transaction(async (tx) => {
      await dao.create({ name: 'committed' } as any, { transaction: tx });
    });
    const afterCommit = await Thing.count();
    expect(afterCommit).toBe(1);

    // ROLLBACK path
    const tx = await sequelize.transaction();
    await dao.create({ name: 'rolled-back' } as any, { transaction: tx });
    await tx.rollback();

    const afterRollback = await Thing.count();
    expect(afterRollback).toBe(1); // unchanged
  });

  it('runWithManagedTx() executes the function in a managed transaction when none provided', async () => {
    await dao.runWithManagedTx(async (tx) => {
      await dao.create({ name: 'inside-managed' } as any, { transaction: tx });
    });
    const count = await Thing.count({ where: { name: 'inside-managed' } as any });
    expect(count).toBe(1);
  });

  it('sequelize getter throws if model is not bound to any Sequelize instance', async () => {
    class Unbound extends Model<InferAttributes<Unbound>, InferCreationAttributes<Unbound>> {
      declare id: CreationOptional<number>;
      declare name: string;
    }
    class UnboundDAO extends BaseDAO<Unbound> {
      public poke() {
        return this.sequelize; // should throw
      }
    }
    const unboundDao = new UnboundDAO(Unbound as any);

    expect(() => unboundDao.poke()).toThrow(
      /is not bound to a Sequelize instance/i
    );
  });
});
