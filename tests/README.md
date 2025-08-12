# Test Organization

This directory contains all tests for the AI Daily Assistant project, organized by type and purpose.

## Directory Structure

```
tests/
├── unit/           # Unit tests (isolated component/function tests)
├── integration/    # Integration tests (API, service, and system tests)
├── e2e/           # End-to-end tests (full user workflow tests)
├── manual/        # Manual test files (HTML test pages)
├── mocks/         # Mock data and test utilities
└── README.md      # This file
```

## Test Types

### Unit Tests (`unit/`)
- Component tests
- Service function tests
- Utility function tests
- Python module tests

### Integration Tests (`integration/`)
- API endpoint tests
- Database integration tests
- Service integration tests
- OAuth and authentication tests
- MCP server tests

### End-to-End Tests (`e2e/`)
- Full user workflow tests
- Cross-browser compatibility tests
- Accessibility tests
- Performance tests

### Manual Tests (`manual/`)
- HTML test pages for manual verification
- UI component test pages
- System validation pages

## Running Tests

### Frontend Tests (Vitest)
```bash
npm run test          # Run all unit tests
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI
```

### E2E Tests (Playwright)
```bash
npm run test:e2e      # Run all e2e tests
npm run test:e2e:ui   # Run e2e tests with UI
```

### Backend Tests
```bash
cd twilio-openrouter-voice
npm test              # Run backend tests
```

### Python Tests
```bash
python -m pytest tests/unit/
```

## Test Guidelines

1. **Unit Tests**: Test individual components/functions in isolation
2. **Integration Tests**: Test interactions between components/services
3. **E2E Tests**: Test complete user workflows
4. **Manual Tests**: Use HTML pages for visual verification

## Adding New Tests

1. Place tests in the appropriate directory based on type
2. Follow naming conventions:
   - Unit: `*.test.ts` or `*.spec.ts`
   - Integration: `*.integration.test.ts`
   - E2E: `*.spec.ts` in e2e directory
3. Include proper test descriptions and assertions
4. Mock external dependencies appropriately

## Test Coverage

Aim for:
- Unit tests: 80%+ coverage
- Integration tests: Key workflows covered
- E2E tests: Critical user paths covered
