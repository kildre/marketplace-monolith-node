import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import SubmitRequestRequestDto from "src/main/web/dtos/SubmitRequestRequestDto";

describe("SubmitRequestRequestDto", () => {
  const validData = {
    requestNumber: "REQ-1",
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
    cartItems: [],
  };

  test("should create a valid SubmitRequestRequestDto", () => {
    const dto = new SubmitRequestRequestDto(validData);
    expect(dto.requestNumber).toBe(validData.requestNumber);
    expect(dto.cartItems).toEqual([]);
  });

  test("should throw ConstraintError for non-string requestNumber", () => {
    const data = { ...validData, requestNumber: 123 as any };
    expect(() => new SubmitRequestRequestDto(data)).toThrow(ConstraintError);
  });
});
