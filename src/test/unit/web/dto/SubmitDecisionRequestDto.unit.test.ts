import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import SubmitDecisionRequestDto from "src/main/web/dtos/SubmitDecisionRequestDto";

describe("SubmitDecisionRequestDto", () => {
  const validData = {
    decisionNumber: "DEC-1",
    requestNumber: "REQ-1",
    adjudicatorEmail: "judge@example.com",
    statusId: 1,
    comments: "Approved",
    ticketType: "typeA",
    asset: "assetA",
    quantity: 2,
    estimatedPrice: 100.5,
  };

  test("should create a valid SubmitDecisionRequestDto", () => {
    const dto = new SubmitDecisionRequestDto(validData);
    expect(dto.decisionNumber).toBe(validData.decisionNumber);
    expect(dto.requestNumber).toBe(validData.requestNumber);
    expect(dto.adjudicatorEmail).toBe(validData.adjudicatorEmail);
    expect(dto.statusId).toBe(validData.statusId);
    expect(dto.comments).toBe(validData.comments);
    expect(dto.ticketType).toBe(validData.ticketType);
    expect(dto.asset).toBe(validData.asset);
    expect(dto.quantity).toBe(validData.quantity);
    expect(dto.estimatedPrice).toBe(validData.estimatedPrice);
  });

  test("should throw ConstraintError for non-string decisionNumber", () => {
    const data = { ...validData, decisionNumber: 123 as any };
    expect(() => new SubmitDecisionRequestDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-int statusId", () => {
    const data = { ...validData, statusId: "not-an-int" as any };
    expect(() => new SubmitDecisionRequestDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-number estimatedPrice", () => {
    const data = { ...validData, estimatedPrice: "not-a-number" as any };
    expect(() => new SubmitDecisionRequestDto(data)).toThrow(ConstraintError);
  });
});
