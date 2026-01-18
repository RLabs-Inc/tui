# Development Setup

> Set up your development environment for TUI

## Requirements

- **Bun**: 1.0 or later (recommended)
- **Node.js**: 18+ (alternative)
- **Terminal**: Modern terminal with true color support
- **Editor**: VS Code recommended (for TypeScript support)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/rlabs-inc/tui.git
cd tui

# Install dependencies
bun install

# Run tests to verify setup
bun test

# Run an example
bun run dev
```

## Project Structure

```
tui/
├── src/                    # Source code
│   ├── api/               # Public API (mount)
│   ├── engine/            # Core engine (arrays, registry)
│   ├── pipeline/          # Render pipeline
│   ├── primitives/        # Components (box, text)
│   ├── renderer/          # Terminal output
│   ├── state/             # State modules
│   ├── types/             # Type definitions
│   └── utils/             # Utilities
├── test/                   # Test files
├── examples/               # Example applications
├── docs/                   # Documentation
└── package.json
```

## Commands

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test test/titan-engine.test.ts

# Run tests matching pattern
bun test --grep "flexbox"

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Type Checking

```bash
# Check types
bun run typecheck

# Watch mode (if configured)
bunx tsc --watch --noEmit
```

### Examples

```bash
# Run the default example (hello counter)
bun run dev

# Specific showcase examples
bun run examples/showcase/01-hello-counter.ts
bun run examples/showcase/02-live-clock.ts
bun run examples/showcase/03-theme-gallery.ts
bun run examples/showcase/04-dashboard.ts
bun run examples/showcase/05-scrollable-list.ts
```

### Benchmarks

```bash
# Realistic benchmark
bun run test/realistic-benchmark.ts

# Stress benchmark
bun run test/stress-benchmark.ts
```

## Editor Setup

### VS Code

Recommended extensions:
- TypeScript and JavaScript Language Features (built-in)
- ESLint (if configured)
- Error Lens (for inline errors)

Settings (`.vscode/settings.json`):
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Other Editors

Any editor with TypeScript support will work. Ensure:
- TypeScript language service is enabled
- Project uses the local `tsconfig.json`

## Debugging

### VS Code Launch Config

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Example",
      "program": "${workspaceFolder}/examples/showcase/01-hello-counter.ts",
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/test/titan-engine.test.ts",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### Console Debugging

For quick debugging, use console.log with care:

```typescript
// Debug logging (remove before commit)
console.error('[DEBUG]', layoutResult)

// Or use window title for non-blocking debug
process.stdout.write(`\x1b]0;DEBUG: ${value}\x07`)
```

### Terminal State Recovery

If your terminal gets stuck in raw mode:

```bash
# Reset terminal
reset

# Or
stty sane
```

## Working with the Codebase

### Making Changes to Primitives

When modifying `box.ts` or `text.ts`:

1. Update the parallel array bindings
2. Update types in `primitives/types.ts`
3. Update layout if needed (titan-engine.ts)
4. Update frame buffer if visual changes
5. Add/update tests

### Adding a New Primitive

1. Create `src/primitives/yourPrimitive.ts`
2. Define props in `src/primitives/types.ts`
3. Export from `src/primitives/index.ts`
4. Add array properties if needed
5. Update layout engine if needed
6. Update frame buffer renderer
7. Add tests and documentation

### Modifying the Layout Engine

The TITAN engine is in `src/pipeline/layout/titan-engine.ts`:

1. Make changes to the layout algorithm
2. Run layout tests: `bun test test/titan-engine.test.ts`
3. Run visual tests with examples
4. Benchmark to ensure no regression

### Adding State Modules

1. Create `src/state/yourModule.ts`
2. Export from `src/state/index.ts`
3. Wire up in `src/api/mount.ts` if needed
4. Add documentation

## Testing Your Changes

### Manual Testing

```bash
# Create a test file
echo 'import { mount, box, text } from "./src"
mount(() => box({ children: () => text({ content: "Test" }) }))' > test.ts

# Run it
bun run test.ts

# Clean up
rm test.ts
```

### Visual Testing

For visual changes, use the showcase:

```bash
bun run examples/showcase/01-hello-counter.ts
```

### Performance Testing

After changes, run benchmarks:

```bash
# Should see similar or better numbers
bun run test/realistic-benchmark.ts
```

## Common Issues

### "Cannot find module"

```bash
# Ensure dependencies are installed
bun install
```

### Terminal Not Restoring

```bash
# Reset terminal
reset
# Or press Ctrl+C multiple times
```

### Tests Failing

```bash
# Clean and reinstall
rm -rf node_modules
bun install
bun test
```

### TypeScript Errors

```bash
# Check for type errors
bun run typecheck

# If persistent, check tsconfig.json
```

## Next Steps

- Read the [Architecture Guide](./architecture.md)
- Explore [Internals](./internals/)
- Check open issues for things to work on

## See Also

- [Contributing Guide](./README.md)
- [Architecture](./architecture.md)
- [API Reference](../api/README.md)
