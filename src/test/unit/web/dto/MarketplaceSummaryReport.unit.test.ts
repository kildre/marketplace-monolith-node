import "reflect-metadata";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import MarketplaceSummaryReport from "src/main/web/dtos/MarketplaceSummaryReport";

describe("MarketplaceSummaryReport", () => {
  const validData = {
    totalUsers: 10,
    totalUseCases: 5,
    totalOrders: 3,
  };

  test("should create a valid MarketplaceSummaryReport", () => {
    const dto = new MarketplaceSummaryReport(validData);
    expect(dto.totalUsers).toBe(validData.totalUsers);
    expect(dto.totalUseCases).toBe(validData.totalUseCases);
    expect(dto.totalOrders).toBe(validData.totalOrders);
  });

  test("should throw ConstraintError for non-int totalUsers", () => {
    const data = { ...validData, totalUsers: "not-an-int" as any };
    expect(() => new MarketplaceSummaryReport(data)).toThrow(ConstraintError);
  });

  // removed errMsg property tests
});
