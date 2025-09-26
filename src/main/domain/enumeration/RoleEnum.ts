export class RoleEnum {
  static readonly ADJUDICATOR = new RoleEnum(1, "ADJUDICATOR");
  static readonly REQUESTOR = new RoleEnum(2, "REQUESTOR");

  private static readonly values = [RoleEnum.ADJUDICATOR, RoleEnum.REQUESTOR];

  private constructor(
    public readonly id: number,
    public readonly code: string
  ) {}

  static fromId(id: number): RoleEnum | undefined {
    return RoleEnum.values.find(role => role.id === id);
  }

  static fromCode(code: string): RoleEnum | undefined {
    return RoleEnum.values.find(role => role.code === code);
  }
}