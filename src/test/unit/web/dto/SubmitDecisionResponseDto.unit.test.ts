import "reflect-metadata";
import ConstraintError from "src/domain/errors/ConstraintError";
import SubmitDecisionResponseDto from "src/web/dtos/SubmitDecisionResponseDto";

describe("SubmitDecisionResponseDto", () => {
  const validData = {
    decisionNumber: "DEC-1",
    errMsg: "",
  };

  test("should create a valid SubmitDecisionResponseDto", () => {
    const dto = new SubmitDecisionResponseDto(validData);
    expect(dto.decisionNumber).toBe(validData.decisionNumber);
    expect(dto.errMsg).toBe(validData.errMsg);
  });

  test("should throw ConstraintError for non-string decisionNumber", () => {
    const data = { ...validData, decisionNumber: 123 as any };
    expect(() => new SubmitDecisionResponseDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-string errMsg", () => {
    const data = { ...validData, errMsg: 123 as any };
    expect(() => new SubmitDecisionResponseDto(data)).toThrow(ConstraintError);
  });
});
