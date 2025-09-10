import ConstraintError from "src/domain/errors/ConstraintError";
import RoleCheckResponseDto from "src/web/dtos/RoleCheckResponseDto";

describe("RoleCheckResponseDto", () => {
  const validData = {
    hasRole: true,
    errMsg: "",
  };

  test("should create a valid RoleCheckResponseDto with hasRole true", () => {
    const dto = new RoleCheckResponseDto(validData);
    expect(dto.hasRole).toBe(true);
    expect(dto.errMsg).toBe("");
  });

  test("should create a valid RoleCheckResponseDto with hasRole false", () => {
    const dto = new RoleCheckResponseDto({ hasRole: false, errMsg: "" });
    expect(dto.hasRole).toBe(false);
    expect(dto.errMsg).toBe("");
  });

  test("should create a valid RoleCheckResponseDto with hasRole null", () => {
    const dto = new RoleCheckResponseDto({ hasRole: null, errMsg: "" });
    expect(dto.hasRole).toBeNull();
    expect(dto.errMsg).toBe("");
  });

  test("should create a valid RoleCheckResponseDto with errMsg", () => {
    const dto = new RoleCheckResponseDto({
      hasRole: false,
      errMsg: "Some error",
    });
    expect(dto.hasRole).toBe(false);
    expect(dto.errMsg).toBe("Some error");
  });

  test("should throw ConstraintError for non-string errMsg", () => {
    const data = { hasRole: true, errMsg: 12345 as any };
    expect(() => new RoleCheckResponseDto(data)).toThrow(ConstraintError);
  });

  test("should default hasRole to null if not provided", () => {
    const dto = new RoleCheckResponseDto({ errMsg: "" });
    expect(dto.hasRole).toBeNull();
    expect(dto.errMsg).toBe("");
  });

  test("should default errMsg to empty string if not provided", () => {
    const dto = new RoleCheckResponseDto({ hasRole: true });
    expect(dto.hasRole).toBe(true);
    expect(dto.errMsg).toBe("");
  });
});
