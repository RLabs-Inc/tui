# my-app

A TUI Framework application.

## Getting Started

```bash
# Run in development
bun run dev

# Build for production
bun run build
```

## Project Structure

```
my-app/
├── src/
│   ├── main.ts           # Entry point
│   ├── App.tui           # Root component
│   └── components/       # Reusable components
│       └── Counter.tui
├── bunfig.toml           # Bun configuration (enables .tui compiler)
├── package.json
└── tsconfig.json
```

## Learn More

- [TUI Framework Documentation](https://github.com/rlabs-inc/tui)
- [Signals Library](https://github.com/rlabs-inc/signals)
