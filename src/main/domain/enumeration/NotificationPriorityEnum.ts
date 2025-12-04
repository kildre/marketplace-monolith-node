export class NotificationPriorityEnum {
  static readonly HIGH = new NotificationPriorityEnum(1, "HIGH", 1);
  static readonly MEDIUM = new NotificationPriorityEnum(2, "MEDIUM", 2);
  static readonly LOW = new NotificationPriorityEnum(3, "LOW", 3);

  private static readonly values = [NotificationPriorityEnum.HIGH, NotificationPriorityEnum.MEDIUM, NotificationPriorityEnum.LOW];

  private constructor(
    public readonly id: number,
    public readonly code: string,
    public readonly level: number,
  ) {}

  static fromId(id: number): NotificationPriorityEnum | undefined {
    return NotificationPriorityEnum.values.find(role => role.id === id);
  }

  static fromCode(code: string): NotificationPriorityEnum | undefined {
    return NotificationPriorityEnum.values.find(role => role.code === code);
  }
}