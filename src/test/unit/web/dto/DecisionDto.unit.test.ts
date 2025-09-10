import ConstraintError from "src/domain/errors/ConstraintError";
import DecisionDto from "src/web/dtos/DecisionDto";

describe("DecisionDto", () => {
  const validData = {
    decisionNumber: "DEC-12345",
    statusId: 1,
    adjudicatorEmail: "judge@example.com",
    comments: "Approved after review.",
    createdAt: new Date("2025-09-10T10:00:00Z"),
    updatedAt: new Date("2025-09-10T12:00:00Z"),
  };

  test("should create a valid DecisionDto", () => {
    const dto = new DecisionDto(validData);
    expect(dto.decisionNumber).toBe(validData.decisionNumber);
    expect(dto.statusId).toBe(validData.statusId);
    expect(dto.adjudicatorEmail).toBe(validData.adjudicatorEmail);
    expect(dto.comments).toBe(validData.comments);
    expect(dto.createdAt).toEqual(validData.createdAt);
    expect(dto.updatedAt).toEqual(validData.updatedAt);
  });

  test("should throw ConstraintError for empty decisionNumber", () => {
    const data = { ...validData, decisionNumber: "" };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-integer statusId", () => {
    const data = { ...validData, statusId: "not-an-int" as any };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for empty adjudicatorEmail", () => {
    const data = { ...validData, adjudicatorEmail: "" };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for empty comments", () => {
    const data = { ...validData, comments: "" };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for missing createdAt", () => {
    const data = { ...validData, createdAt: undefined as any };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for missing updatedAt", () => {
    const data = { ...validData, updatedAt: undefined as any };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-date createdAt", () => {
    const data = { ...validData, createdAt: "not-a-date" as any };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-date updatedAt", () => {
    const data = { ...validData, updatedAt: "not-a-date" as any };
    expect(() => new DecisionDto(data)).toThrow(ConstraintError);
  });
});
