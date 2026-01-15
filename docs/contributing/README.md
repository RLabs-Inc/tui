# Contributing Guide

> How to contribute to TUI

## Welcome

Thank you for your interest in contributing to TUI! This guide will help you get started.

## Quick Links

- [Development Setup](./development.md) - Get your environment ready
- [Architecture Overview](./architecture.md) - How TUI works
- [Internals Deep-Dive](./internals/) - Implementation details

## Ways to Contribute

### Bug Reports

Found a bug? [Open an issue](https://github.com/rlabs-inc/tui/issues) with:

1. TUI version and Node/Bun version
2. Terminal emulator and OS
3. Minimal reproduction code
4. Expected vs actual behavior

### Feature Requests

Have an idea? Open an issue to discuss before implementing. Include:

1. Use case description
2. Proposed API
3. Alternatives considered

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a PR with clear description

## Development Workflow

### 1. Setup

```bash
# Clone
git clone https://github.com/rlabs-inc/tui.git
cd tui

# Install dependencies
bun install
```

### 2. Run Tests

```bash
# All tests
bun test

# Specific test file
bun test test/titan-engine.test.ts

# Watch mode
bun test --watch
```

### 3. Run Examples

```bash
# Basic example
bun run examples/hello.ts

# Full showcase
bun run examples/showcase/showcase.ts
```

### 4. Type Check

```bash
bun run typecheck
```

### 5. Run Benchmarks

```bash
bun run test/realistic-benchmark.ts
bun run test/stress-benchmark.ts
```

## Code Style

### TypeScript

- Use strict mode
- Prefer explicit types for public APIs
- Use JSDoc comments for exports

### Naming

- `camelCase` for functions and variables
- `PascalCase` for types and interfaces
- `UPPER_SNAKE_CASE` for constants

### File Organization

- One concept per file
- Colocate related code
- Export through index.ts files

## Architecture Principles

### 1. Parallel Arrays

Components write to arrays via `bind()`, not effect-based reconciliation.

```typescript
// Good: Direct bind
dimensions.width[index] = bind(props.width ?? 0)

// Bad: Effect-based update
effect(() => {
  dimensions.width[index] = props.width?.value ?? 0
})
```

### 2. Deriveds Return Values

Pipeline stages are deriveds that return computed values.

```typescript
// Good: Return computed value
const layoutDerived = derived(() => {
  return computeLayout(...)
})

// Bad: Mutate state in derived
const layoutDerived = derived(() => {
  layoutState.positions = computeLayout(...)  // Don't do this!
})
```

### 3. One Render Effect

The render pipeline has exactly one effect - the terminal write.

```typescript
// Good: Single effect at the end
effect(() => {
  const buffer = frameBufferDerived.value
  renderer.render(buffer)
})
```

### 4. Props Bind Directly

Components bind props directly without extracting values first.

```typescript
// Good: Bind prop directly
dimensions.width[index] = bind(props.width ?? 0)

// Bad: Extract then bind (loses reactivity)
const w = props.width?.value ?? 0
dimensions.width[index] = bind(w)  // Static!
```

## Testing

### Unit Tests

Test pure functions in isolation:

```typescript
import { describe, test, expect } from 'bun:test'
import { computeLayoutTitan } from '../src/pipeline/layout/titan-engine'

describe('TITAN Layout', () => {
  test('calculates flexbox layout', () => {
    const result = computeLayoutTitan(80, 24, indices)
    expect(result.w[0]).toBe(40)
  })
})
```

### Integration Tests

Test components with the full pipeline:

```typescript
test('box renders correctly', async () => {
  const { buffer } = await renderToBuffer(() => {
    box({ width: 10, height: 3, border: BorderStyle.SINGLE })
  })
  expect(buffer.toString()).toContain('┌────────┐')
})
```

## Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass (`bun test`)
- [ ] Types check (`bun run typecheck`)
- [ ] Documentation updated if needed
- [ ] Commit messages are clear
- [ ] PR description explains changes

## Commit Messages

Follow conventional commits:

```
feat: Add input component
fix: Correct border rendering on resize
docs: Update keyboard guide
refactor: Simplify layout algorithm
test: Add flexbox wrap tests
perf: Optimize frame buffer generation
```

## Getting Help

- Open a discussion for questions
- Join the community chat (if available)
- Check existing issues/PRs

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## See Also

- [Development Setup](./development.md)
- [Architecture](./architecture.md)
- [Parallel Arrays](./internals/parallel-arrays.md)
- [TITAN Engine](./internals/titan-engine.md)
