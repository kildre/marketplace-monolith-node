import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import UseCaseRequestDto from "src/main/web/dtos/UseCaseRequestDto";

describe("UseCaseRequestDto", () => {
  const validData = {
    requestNumber: "REQ-1",
    statusId: 1,
    requestorEmail: "user@example.com",
    designation: "Manager",
    agency: "AgencyA",
    organization: "OrgA",
    otherOrganization: "OtherOrg",
    pointOfContact: "POC",
    email: "email@example.com",
    phoneNumber: "1234567890",
    estimatedRom: "1000",
    requestedToolName: "ToolA",
    description: "desc",
    createdAt: new Date(),
    updatedAt: new Date(),
    decision: undefined,
    cartItems: [],
  };

  test("should create a valid UseCaseRequestDto", () => {
    const dto = new UseCaseRequestDto(validData);
    expect(dto.requestNumber).toBe(validData.requestNumber);
    expect(dto.statusId).toBe(validData.statusId);
    expect(dto.requestorEmail).toBe(validData.requestorEmail);
    expect(dto.cartItems).toEqual([]);
  });

  test("should throw ConstraintError for non-string requestNumber", () => {
    const data = { ...validData, requestNumber: 123 as any };
    expect(() => new UseCaseRequestDto(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-int statusId", () => {
    const data = { ...validData, statusId: "not-an-int" as any };
    expect(() => new UseCaseRequestDto(data)).toThrow(ConstraintError);
  });
});
