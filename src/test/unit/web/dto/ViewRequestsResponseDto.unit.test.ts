import "reflect-metadata";
import ConstraintError from "src/domain/errors/ConstraintError";
import ViewRequestsResponseDto from "src/web/dtos/ViewRequestsResponseDto";

describe("ViewRequestsResponseDto", () => {
  const validData = {
    requests: [],
    errMsg: "",
  };

  test("should create a valid ViewRequestsResponseDto", () => {
    const dto = new ViewRequestsResponseDto(validData);
    expect(dto.requests).toEqual([]);
    expect(dto.errMsg).toBe("");
  });

  test("should throw ConstraintError for non-array requests", () => {
    const data = { ...validData, requests: "not-an-array" as any };
    expect(() => new ViewRequestsResponseDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-string errMsg", () => {
    const data = { ...validData, errMsg: 123 as any };
    expect(() => new ViewRequestsResponseDto(data)).toThrow(ConstraintError);
  });
});
