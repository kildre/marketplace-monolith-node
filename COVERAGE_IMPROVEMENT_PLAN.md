# Code Coverage Improvement Plan

**Current Coverage:** 32.4%  
**Target Coverage:** 80%+  
**Project:** advana-marketplace-monolith-node

---

## Overview

This document outlines a strategic plan to improve code coverage from 32.4% to 80%+ by systematically testing uncovered code, focusing on high-value areas first.

---

## Quick Analysis Results

### Major Coverage Gaps Identified

1. **Controllers:** 5 controllers with **0% test coverage**
2. **Services:** 7 of 8 services with **minimal/no test coverage**
3. **DAO Layer:** Partially tested (good foundation exists)
4. **Middleware:** Coverage needs verification

---

## Action Plan

### **Step 1: Quick Wins - Test Controllers (Biggest Impact)**

Controllers handle business logic and HTTP routing. Testing them provides the most significant coverage boost.

#### Files to Test (Priority Order)

1. `src/main/web/controllers/userController.ts`
2. `src/main/web/controllers/requestController.ts`
3. `src/main/web/controllers/decisionController.ts`
4. `src/main/web/controllers/rootController.ts`
5. `src/main/web/controllers/errorTestController.ts`

#### Test Location

Create tests in: `src/test/unit/web/controllers/`

#### Example Controller Test Template

```typescript
// src/test/unit/web/controllers/userController.unit.test.ts
import { Request, Response } from 'express';
import * as userController from '../../../../main/web/controllers/userController';
import userEndpointService from '../../../../main/service/userEndpointService';

jest.mock('../../../../main/service/userEndpointService');

describe('userController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    
    req = { 
      body: {}, 
      params: {},
      query: {} 
    };
    
    res = {
      status: mockStatus,
      json: mockJson
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const mockUser = { id: 1, name: 'Test User' };
      (userEndpointService.getUser as jest.Mock).mockResolvedValue(mockUser);
      req.params = { id: '1' };

      // Act
      await userController.getUserById(req as Request, res as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      (userEndpointService.getUser as jest.Mock).mockResolvedValue(null);
      req.params = { id: '999' };

      // Act
      await userController.getUserById(req as Request, res as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Database error');
      (userEndpointService.getUser as jest.Mock).mockRejectedValue(error);
      req.params = { id: '1' };

      // Act
      await userController.getUserById(req as Request, res as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // Add more test suites for other controller methods...
});
```

#### What to Test in Controllers

- ✅ **Happy path:** Valid inputs return expected responses
- ✅ **Error handling:** Invalid inputs return appropriate error codes
- ✅ **Validation:** Request validation works correctly
- ✅ **Status codes:** Correct HTTP status codes (200, 400, 404, 500)
- ✅ **Service calls:** Services are called with correct parameters
- ✅ **Response format:** JSON responses match expected structure

**Expected Coverage Gain:** +13-18% (to ~45-50%)

---

### **Step 2: Add Service Layer Tests**

Services contain core business logic and should be thoroughly tested.

#### Service Files to Test

1. `src/main/service/validatorService.ts` ← **Security critical**
2. `src/main/service/securityService.ts` ← **Authentication/Authorization**
3. `src/main/service/requestEndpointService.ts`
4. `src/main/service/decisionEndpointService.ts`
5. `src/main/service/pgService.ts`
6. `src/main/service/loggingService.ts`
7. `src/main/service/sequelize.ts`

**Note:** `userEndpointService.ts` already has tests (good example to follow!)

#### Service Test Location

Create tests in: `src/test/unit/service/`

#### Example Service Test Template

```typescript
// src/test/unit/service/validatorService.unit.test.ts
import * as validatorService from '../../../main/service/validatorService';

describe('validatorService', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validatorService.validateEmail('user@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validatorService.validateEmail('invalid-email')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(validatorService.validateEmail(null)).toBe(false);
      expect(validatorService.validateEmail(undefined)).toBe(false);
    });
  });

  // Add more validation method tests...
});
```

#### What to Test in Services

- ✅ **Business logic:** Core functionality works correctly
- ✅ **Edge cases:** Boundary conditions and unusual inputs
- ✅ **Error handling:** Exceptions are caught and handled
- ✅ **Data validation:** Input validation works as expected
- ✅ **External dependencies:** Mock database calls, APIs, etc.

**Expected Coverage Gain:** +15-20% (to ~65-70%)

---

### **Step 3: Test DAOs (Expand Existing Coverage)**

You already have DAO tests, but they may need expansion.

#### DAO Files to Verify Coverage

- `BaseDAO.ts`
- `MarketplaceUserDAO.ts`
- `RoleDAO.ts`
- `UseCaseRequestDAO.ts`
- `OrderItemDAO.ts`
- `UserRoleDAO.ts`
- `StatusDAO.ts`
- `ProductDAO.ts`
- `MarketplaceOrderDAO.ts`
- `DecisionDAO.ts`

#### Check Existing Tests

```bash
ls -la src/test/unit/rdbms/dao/
```

#### What to Test in DAOs

- ✅ **CRUD operations:** Create, Read, Update, Delete
- ✅ **Query methods:** findById, findAll, findWhere, etc.
- ✅ **Relationships:** Foreign key handling, joins
- ✅ **Transactions:** Rollback on error
- ✅ **Error scenarios:** Database connection failures

**Expected Coverage Gain:** +5-10% (if gaps exist)

---

### **Step 4: Target Specific Coverage Gaps**

Run detailed coverage report to identify remaining gaps:

```bash
# Run unit tests with detailed HTML coverage report
npm run test:unit -- --coverage --coverageReporters=html lcov text
```

Then open: `reports/coverage/lcov-report/index.html`

#### What to Look For

- 🔴 **Files with 0% coverage** (red highlighting)
- 🟡 **Files with < 50% coverage** (yellow highlighting)
- 📊 **Uncovered lines** (specific line numbers)

#### Common Gap Areas

1. **Middleware:** `src/main/middleware/errorHandler.ts`
2. **Configuration:** `src/main/config/*.ts` files
3. **Domain logic:** `src/main/domain/enumeration/`, `src/main/domain/errors/`
4. **Utilities:** Helper functions and utility modules

---

## Recommended Test Writing Order

### **Priority 1 - Controllers** (5 files, ~500-1000 LOC)

1. ✅ `userController.ts`
2. ✅ `requestController.ts`
3. ✅ `decisionController.ts`
4. ✅ `rootController.ts`
5. ✅ `errorTestController.ts`

### **Priority 2 - Services** (7 files, untested)

1. ✅ `validatorService.ts` ← Security critical
2. ✅ `securityService.ts` ← Authentication
3. ✅ `requestEndpointService.ts`
4. ✅ `decisionEndpointService.ts`
5. ✅ `pgService.ts`
6. ✅ `loggingService.ts`
7. ✅ `sequelize.ts`

### **Priority 3 - Middleware**

- ✅ Check if `errorHandler.ts` has adequate coverage
- ✅ Add tests if coverage < 80%

### **Priority 4 - Utilities**

- ✅ Any helper functions in `domain/enumeration/`
- ✅ Config files in `src/main/config/`

---

## Quick Coverage Boost Commands

```bash
# 1. Create controller tests folder
mkdir -p src/test/unit/web/controllers

# 2. Create service tests folder (if needed)
mkdir -p src/test/unit/service

# 3. Run unit tests with verbose coverage
npm run test:unit -- --coverage --verbose

# 4. Generate HTML coverage report
npm run test:unit -- --coverage --coverageReporters=html

# 5. Open coverage report in browser
open reports/coverage/lcov-report/index.html

# 6. After adding tests, run full SonarQube analysis
npm run sonar:full:unit && npm run sonar:report

# 7. View SonarQube report
open reports/sonarqube-report.html
```

---

## Expected Coverage Progression

| Phase | Coverage | Description |
|-------|----------|-------------|
| **Current** | 32.4% | Starting point with DAO tests only |
| **After Controllers** | ~45-50% | +13-18% from testing all 5 controllers |
| **After Services** | ~65-70% | +15-20% from testing 7 services |
| **After Middleware** | ~70-75% | +5% from middleware and utilities |
| **Target** | 80%+ | Industry standard for production code |

---

## Testing Best Practices

### 1. **Test Structure (AAA Pattern)**

```typescript
it('should do something', () => {
  // Arrange - Set up test data and mocks
  const input = { id: 1 };
  
  // Act - Execute the function under test
  const result = myFunction(input);
  
  // Assert - Verify the results
  expect(result).toBe(expected);
});
```

### 2. **Mock External Dependencies**

```typescript
jest.mock('../../../../main/service/userEndpointService');
```

### 3. **Test Both Success and Failure Cases**

- Happy path (valid inputs)
- Error cases (invalid inputs, exceptions)
- Edge cases (null, undefined, empty strings)

### 4. **Use Descriptive Test Names**

```typescript
// ✅ Good
it('should return 404 when user does not exist')

// ❌ Bad
it('test user endpoint')
```

### 5. **Clean Up After Tests**

```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Tracking Progress

### Check Coverage After Each Phase

```bash
# Run tests and generate report
npm run test:unit -- --coverage

# View summary in terminal
# Or open detailed HTML report
open reports/coverage/lcov-report/index.html
```

### SonarQube Integration

```bash
# Run full analysis with coverage
npm run sonar:full:unit

# Generate HTML report
npm run sonar:report

# View in browser
open reports/sonarqube-report.html

# Or view on SonarQube dashboard
open https://sonarqube.cdao.us/dashboard?id=tenant-metrostar-advana-marketplace-monolith-node
```

---

## Common Pitfalls to Avoid

1. ❌ **Testing implementation details** instead of behavior
2. ❌ **Not mocking external dependencies** (databases, APIs)
3. ❌ **Writing tests that depend on each other**
4. ❌ **Ignoring edge cases** (null, undefined, empty arrays)
5. ❌ **Not testing error handling** (only testing happy paths)
6. ❌ **Hardcoding test data** that may change over time

---

## Next Steps

1. **Start with Priority 1 Controllers** (biggest impact)
2. **Use the test template** provided above
3. **Run coverage after each file** to track progress
4. **Move to Priority 2 Services** once controllers are covered
5. **Target 80%+ coverage** as the goal

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [SonarQube Coverage](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/test-coverage/overview/)
- **Existing Test Examples:** See `src/test/unit/rdbms/dao/` for patterns

---

**Document Created:** October 23, 2025  
**Current Coverage:** 32.4%  
**Target Coverage:** 80%+  
**Estimated Time:** 2-3 weeks with focused effort
