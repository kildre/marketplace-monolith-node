import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import ViewRequestsRequestDto from "src/main/web/dtos/ViewRequestsRequestDto";

describe("ViewRequestsRequestDto", () => {
  const validData = {
    userEmail: "user@example.com",
  };

  test("should create a valid ViewRequestsRequestDto", () => {
    const dto = new ViewRequestsRequestDto(validData);
    expect(dto.userEmail).toBe(validData.userEmail);
  });

  test("should throw ConstraintError for non-string userEmail", () => {
    const data = { ...validData, userEmail: 123 as any };
    expect(() => new ViewRequestsRequestDto(data)).toThrow(ConstraintError);
  });
});
