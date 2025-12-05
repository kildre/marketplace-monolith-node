  interface PropsI {
    id: number;
    code: string
    level: number;
  }

export class NotificationPriorityEnum {
  static readonly HIGH = new NotificationPriorityEnum({id: 1, code: "HIGH", level: 1});
  static readonly MEDIUM = new NotificationPriorityEnum({id: 2, code: "MEDIUM", level: 2});
  static readonly LOW = new NotificationPriorityEnum({id: 3, code: "LOW", level: 3});

  private static readonly values = [NotificationPriorityEnum.HIGH, NotificationPriorityEnum.MEDIUM, NotificationPriorityEnum.LOW];

  public readonly id: number;
  public readonly code: string;
  public readonly level: number;

  private constructor(props: PropsI) {
    this.id = props.id;
    this.code = props.code;
    this.level = props.level;
  }

  static fromId(id: number): NotificationPriorityEnum | undefined {
    return NotificationPriorityEnum.values.find(role => role.id === id);
  }

  static fromCode(code: string): NotificationPriorityEnum | undefined {
    return NotificationPriorityEnum.values.find(role => role.code === code);
  }
}