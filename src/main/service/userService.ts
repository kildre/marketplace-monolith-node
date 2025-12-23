import { MarketplaceUser } from "../rdbms/entities/MarketplaceUser";
import userDao from "../rdbms/dao/marketplaceUserDao";
import UserNotFoundError from "../domain/errors/UserNotFoundError";


export interface UserServiceI {
  findByEmail(email: string): Promise<MarketplaceUser>;
  normalizeEmail(email: string): string;
}

// TODO: Write unit tests for UserService
class UserService implements UserServiceI {
    
    async findByEmail(email: string): Promise<MarketplaceUser> {
        const result = await userDao.findByEmail(email);
        if (!result) {
            throw new UserNotFoundError({ email });
        }
        return result;
    }
    normalizeEmail(email: string): string {
        return email.trim().toLowerCase();;
    }
}

const userService = new UserService();
export default userService;