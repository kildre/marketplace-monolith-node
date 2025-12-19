import { Status } from '../entities/Status';
import { IdDao } from './IdDao';

export class StatusDAO extends IdDao<Status> {
  constructor() {
    super(Status);
  }

  async findByCode(code: string): Promise<Status | null> {
    return Status.findOne({ where: { code } });
  }
}
