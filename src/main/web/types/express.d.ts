import { Request } from 'express';
import { MarketplaceUser } from 'src/main/rdbms/entities';

declare global {
  namespace Express {
    interface Request {
      currentUser?: MarketplaceUser;
    }
  }
}