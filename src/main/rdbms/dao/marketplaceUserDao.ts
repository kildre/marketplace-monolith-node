// src/rdbms/dao/MarketplaceUserDAO.ts
import { sequelize } from '../../config/sequelizeCLIConfig.cjs';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { FindOptions, Transaction, fn, col, where, Op } from 'sequelize';
import { IdDao, IdDaoI } from './IdDao';

type WithTx = { transaction?: Transaction };

export interface MarketplaceUserDaoI extends IdDaoI<MarketplaceUser> {
  findByEmail(
    email: string,
    opts?: Omit<FindOptions, 'where' | 'transaction'> & WithTx
  ): Promise<MarketplaceUser | null>;
}

class MarketplaceUserDAO extends IdDao<MarketplaceUser> implements MarketplaceUserDaoI {
  constructor() {
    super(MarketplaceUser);
  }

  // ---------- helpers ----------
  private async withTx<T>(
    tx: Transaction | undefined,
    fn: (t: Transaction) => Promise<T>
  ): Promise<T> {
    if (tx) return fn(tx);
    return sequelize.transaction(fn);
  }

  // ---------- reads ----------
  async findByEmail(
    email: string,
    opts: Omit<FindOptions, 'where' | 'transaction'> & WithTx = {}
  ): Promise<MarketplaceUser | null> {
    const e = email?.trim().toLowerCase();
    if (!e) throw new Error('email is required');

    const { transaction, ...rest } = opts;

    // Option A (DB-agnostic): lower(email) = lower(:email)
    return this.model.findOne({
      ...rest, // safe: does not contain `where` or `transaction`
      where: where(fn('lower', col('email')), e),
      transaction,
    });
  }
}

const marketplaceUserDao: MarketplaceUserDaoI = new MarketplaceUserDAO();
export default marketplaceUserDao;
