import ConstraintError from "src/main/domain/errors/ConstraintError";
import RoleCheckResponseDto from "src/main/web/dtos/RoleCheckResponseDto";

describe("RoleCheckResponseDto", () => {
  const validData = {
    hasRole: true,
  };

  test("should create a valid RoleCheckResponseDto with hasRole true", () => {
    const dto = new RoleCheckResponseDto(validData);
    expect(dto.hasRole).toBe(true);
  });

  test("should create a valid RoleCheckResponseDto with hasRole false", () => {
    const dto = new RoleCheckResponseDto({ hasRole: false });
    expect(dto.hasRole).toBe(false);
  });

  // removed errMsg property tests
});
