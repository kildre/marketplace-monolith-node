import "reflect-metadata";
import ConstraintError from "src/domain/errors/ConstraintError";
import SubmitRequestResponseDto from "src/web/dtos/SubmitRequestResponseDto";

describe("SubmitRequestResponseDto", () => {
  const validData = {
    requestNumber: "REQ-123",
    errMsg: "",
  };

  test("should create a valid SubmitRequestResponseDto", () => {
    const dto = new SubmitRequestResponseDto(validData);
    expect(dto.requestNumber).toBe(validData.requestNumber);
    expect(dto.errMsg).toBe(validData.errMsg);
  });

  test("should throw ConstraintError for non-string requestNumber", () => {
    const data = { ...validData, requestNumber: 123 as any };
    expect(() => new SubmitRequestResponseDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-string errMsg", () => {
    const data = { ...validData, errMsg: 123 as any };
    expect(() => new SubmitRequestResponseDto(data)).toThrow(ConstraintError);
  });
});
