# 🧪 Testing Guide - BlocHub

## Overview

BlocHub uses a comprehensive testing strategy with multiple layers:
- **Unit Tests** - Jest + React Testing Library
- **Integration Tests** - API route testing
- **E2E Tests** - Playwright for full user flows

---

## 📦 Installed Testing Tools

```json
{
  "devDependencies": {
    "jest": "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "@playwright/test": "^1.58.0",
    "@types/jest": "^30.0.0"
  }
}
```

---

## 🎯 Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (visual debugger)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/landing.spec.ts

# Run on specific browser
npx playwright test --project=chromium
```

---

## 📁 Test Structure

```
blochub/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── __tests__/
│   │           ├── button.test.tsx
│   │           └── card.test.tsx
│   ├── lib/
│   │   └── __tests__/
│   │       └── utils.test.ts
│   └── app/
│       └── api/
│           └── __tests__/
│               └── routes.test.ts
├── e2e/
│   ├── landing.spec.ts
│   ├── auth.spec.ts
│   └── dashboard.spec.ts
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

---

## ✅ Unit Tests Examples

### Testing Components

```typescript
// src/components/ui/__tests__/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })
})
```

### Testing Utilities

```typescript
// src/lib/__tests__/utils.test.ts
import { cn, formatCurrency } from '../utils'

describe('Utils', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toContain('class1')
    expect(cn('class1', 'class2')).toContain('class2')
  })

  it('should format currency', () => {
    expect(formatCurrency(1000)).toBe('1,000 lei')
  })
})
```

### Testing Hooks

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'

describe('useAuth Hook', () => {
  it('should return user when authenticated', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeDefined()
    })
  })
})
```

---

## 🌐 E2E Tests Examples

### Testing User Flows

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/auth/login')

    // Fill form
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')

    // Submit
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should show validation errors', async ({ page }) => {
    await page.goto('/auth/login')
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page.locator('text=/required/i')).toBeVisible()
  })
})
```

### Testing Navigation

```typescript
// e2e/navigation.spec.ts
test('should navigate between pages', async ({ page }) => {
  await page.goto('/')

  // Navigate to features
  await page.click('text=Features')
  await expect(page).toHaveURL('/#features')

  // Navigate to pricing
  await page.click('text=Pricing')
  await expect(page).toHaveURL('/#pricing')
})
```

### Testing Forms

```typescript
test('should submit contact form', async ({ page }) => {
  await page.goto('/contact')

  await page.fill('[name="name"]', 'John Doe')
  await page.fill('[name="email"]', 'john@example.com')
  await page.fill('[name="message"]', 'Hello!')

  await page.click('button[type="submit"]')

  await expect(page.locator('text=/success/i')).toBeVisible()
})
```

---

## 🎨 Testing Best Practices

### 1. Arrange-Act-Assert Pattern

```typescript
test('should add item to cart', () => {
  // Arrange - Setup
  const cart = new Cart()
  const item = { id: 1, name: 'Product', price: 100 }

  // Act - Perform action
  cart.addItem(item)

  // Assert - Verify result
  expect(cart.items).toHaveLength(1)
  expect(cart.total).toBe(100)
})
```

### 2. Test Isolation

```typescript
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks()
  localStorage.clear()
})
```

### 3. Descriptive Test Names

```typescript
// ✅ Good
test('should display error when email is invalid', () => {})

// ❌ Bad
test('test1', () => {})
```

### 4. Test Edge Cases

```typescript
describe('formatCurrency', () => {
  it('should handle positive numbers', () => {
    expect(formatCurrency(100)).toBe('100 lei')
  })

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-100 lei')
  })

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('0 lei')
  })

  it('should handle decimals', () => {
    expect(formatCurrency(100.50)).toBe('100.50 lei')
  })
})
```

---

## 📊 Coverage Goals

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 🔧 Configuration Files

### jest.config.js

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
}

module.exports = createJestConfig(customJestConfig)
```

### playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3004',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: playwright-report/
```

---

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

## 🆘 Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Playwright tests timeout

```typescript
// Increase timeout in playwright.config.ts
use: {
  actionTimeout: 15000,
  navigationTimeout: 30000,
}
```

### Mock NextAuth in tests

```typescript
// jest.setup.js
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))
```

---

**Happy Testing! 🎉**
