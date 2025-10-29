import ConstraintError from "src/main/domain/errors/ConstraintError";
import EmailCheckRequestDto from "src/main/web/dtos/RoleCheckRequestDto";

describe("RoleCheckRequestDto", () => {
  const validData = {
    userEmail: "user@example.com",
  };

  test("should create a valid RoleCheckRequestDto", () => {
    const dto = new EmailCheckRequestDto(validData);
    expect(dto.userEmail).toBe(validData.userEmail);
  });

  test("should throw ConstraintError for empty userEmail", () => {
    const data = { ...validData, userEmail: "" };
    expect(() => new EmailCheckRequestDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for missing userEmail", () => {
    const data = {} as any;
    expect(() => new EmailCheckRequestDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-string userEmail", () => {
    const data = { ...validData, userEmail: 12345 as any };
    expect(() => new EmailCheckRequestDto(data)).toThrow(ConstraintError);
  });
});
