import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import SubmitDecisionResponseDto from "src/main/web/dtos/SubmitDecisionResponseDto";

describe("SubmitDecisionResponseDto", () => {
  const validData = {
    decisionNumber: "DEC-1",
  };

  test("should create a valid SubmitDecisionResponseDto", () => {
    const dto = new SubmitDecisionResponseDto(validData);
    expect(dto.decisionNumber).toBe(validData.decisionNumber);
  });

  test("should throw ConstraintError for non-string decisionNumber", () => {
    const data = { ...validData, decisionNumber: 123 as any };
    expect(() => new SubmitDecisionResponseDto(data)).toThrow(ConstraintError);
  });

  // removed errMsg property tests
});
