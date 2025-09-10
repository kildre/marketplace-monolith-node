import { BaseDAO } from './BaseDAO';
import { Role } from '../entities/Role';

export class RoleDAO extends BaseDAO<Role> {
  constructor() {
    super(Role);
  }
}
