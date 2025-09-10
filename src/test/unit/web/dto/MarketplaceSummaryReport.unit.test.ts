import "reflect-metadata";
import ConstraintError from "src/domain/errors/ConstraintError";
import MarketplaceSummaryReport from "src/web/dtos/MarketplaceSummaryReport";

describe("MarketplaceSummaryReport", () => {
  const validData = {
    totalUsers: 10,
    totalUseCases: 5,
    totalOrders: 3,
    errMsg: "",
  };

  test("should create a valid MarketplaceSummaryReport", () => {
    const dto = new MarketplaceSummaryReport(validData);
    expect(dto.totalUsers).toBe(validData.totalUsers);
    expect(dto.totalUseCases).toBe(validData.totalUseCases);
    expect(dto.totalOrders).toBe(validData.totalOrders);
    expect(dto.errMsg).toBe(validData.errMsg);
  });

  test("should throw ConstraintError for non-int totalUsers", () => {
    const data = { ...validData, totalUsers: "not-an-int" as any };
    expect(() => new MarketplaceSummaryReport(data)).toThrow(ConstraintError);
  });

  test("should throw ConstraintError for non-string errMsg", () => {
    const data = { ...validData, errMsg: 123 as any };
    expect(() => new MarketplaceSummaryReport(data)).toThrow(ConstraintError);
  });
});
