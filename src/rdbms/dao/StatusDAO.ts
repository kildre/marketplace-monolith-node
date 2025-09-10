import { BaseDAO } from './BaseDAO';
import { Status } from '../entities/Status';

export class StatusDAO extends BaseDAO<Status> {
  constructor() {
    super(Status);
  }

  async findByCode(code: string): Promise<Status | null> {
    return Status.findOne({ where: { code } });
  }
}
