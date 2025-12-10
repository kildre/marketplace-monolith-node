import MarketplaceError from "./MarketplaceError";

interface PropsI {
  associationName: string;
  entityClassName: string;
} 

export default class MissingAssociationError extends MarketplaceError {

    constructor(props: PropsI) {
        const errMsg = `Missing required association '${props.associationName}' on entity '${props.entityClassName}'.`;
        super(errMsg, {code: 'MISSING_ASSOCIATION', status: 500});
        this.name = "MissingAssociationError";
        // Fix prototype chain (important for instanceof checks)
        Object.setPrototypeOf(this, new.target.prototype);
    }

}