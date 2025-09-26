import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import SubmitRequestResponseDto from "src/main/web/dtos/SubmitRequestResponseDto";

describe("SubmitRequestResponseDto", () => {
  const validData = {
    requestNumber: "REQ-123",
  };

  test("should create a valid SubmitRequestResponseDto", () => {
    const dto = new SubmitRequestResponseDto(validData);
    expect(dto.requestNumber).toBe(validData.requestNumber);
  });

  test("should throw ConstraintError for non-string requestNumber", () => {
    const data = { ...validData, requestNumber: 123 as any };
    expect(() => new SubmitRequestResponseDto(data)).toThrow(ConstraintError);
  });

  // removed errMsg property tests
});
