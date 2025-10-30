import ConstraintError from "src/main/domain/errors/ConstraintError";
import EmailCheckResponseDto from "src/main/web/dtos/RoleCheckResponseDto";

describe("RoleCheckResponseDto", () => {
  const validData = {
    hasRole: true,
  };

  test("should create a valid RoleCheckResponseDto with hasRole true", () => {
    const dto = new EmailCheckResponseDto(validData);
    expect(dto.hasRole).toBe(true);
  });

  test("should create a valid RoleCheckResponseDto with hasRole false", () => {
    const dto = new EmailCheckResponseDto({ hasRole: false });
    expect(dto.hasRole).toBe(false);
  });

  // removed errMsg property tests
});
