# Installation

TUI is built for [Bun](https://bun.sh), a fast all-in-one JavaScript runtime.

## Requirements

- **Bun** v1.0 or later
- **TypeScript** 5.0+ (included with Bun)
- A terminal supporting ANSI escape codes

## Install Bun

If you don't have Bun installed:

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# Homebrew
brew install oven-sh/bun/bun

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify installation:

```bash
bun --version
```

## Create a New Project

```bash
# Create project directory
mkdir my-tui-app
cd my-tui-app

# Initialize with Bun
bun init -y

# Install TUI
bun add @rlabs-inc/tui
```

## Project Structure

A minimal TUI project looks like:

```
my-tui-app/
├── src/
│   └── index.ts      # Your application entry point
├── package.json
└── tsconfig.json     # TypeScript configuration
```

## TypeScript Configuration

TUI works best with these TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  }
}
```

Bun generates this automatically with `bun init`.

## Verify Installation

Create `src/index.ts`:

```typescript
import { box, text, mount } from '@rlabs-inc/tui'

await mount(() => {
  box({
    padding: 1,
    children: () => {
      text({ content: 'Hello, TUI!' })
    }
  })
})
```

Run it:

```bash
bun run src/index.ts
```

You should see "Hello, TUI!" displayed in your terminal. Press `Ctrl+C` to exit.

## IDE Setup

### VS Code

Install the "TypeScript and JavaScript Language Features" extension (usually pre-installed). TypeScript IntelliSense works automatically.

For better terminal debugging:
- Use VS Code's integrated terminal
- Enable "Terminal: Scroll Lock" when testing fullscreen apps

### Other Editors

TUI is just TypeScript - any editor with TypeScript support works. The `@rlabs-inc/tui` package includes full type definitions.

## Next Steps

Continue to [Quick Start](./quick-start.md) to build your first interactive app.
