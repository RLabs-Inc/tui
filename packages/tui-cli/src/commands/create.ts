/**
 * Create command - scaffold a new TUI Framework project
 */

import { mkdir, exists } from 'fs/promises'
import { join, resolve, basename } from 'path'
import { $ } from 'bun'
import { c, symbols, box } from '../utils/colors'
import { text, confirm, spinner } from '../utils/prompts'

interface CreateOptions {
  projectName?: string
  template?: string
}

export async function create(options: CreateOptions) {
  console.log()
  console.log(box([
    `${c.brightCyan(symbols.sparkle)} ${c.bold('Create TUI Project')} ${c.brightCyan(symbols.sparkle)}`,
    '',
    c.dim('Scaffold a new TUI Framework application'),
  ], { padding: 1 }))
  console.log()

  // Get project name
  let projectName = options.projectName

  if (!projectName) {
    projectName = await text({
      message: 'Project name',
      placeholder: 'my-tui-app',
      defaultValue: 'my-tui-app',
      validate: (value) => {
        if (!value) return 'Project name is required'
        if (!/^[a-z0-9-_]+$/i.test(value)) {
          return 'Project name can only contain letters, numbers, dashes, and underscores'
        }
        return true
      }
    })
  }

  const projectPath = resolve(process.cwd(), projectName)
  const displayName = basename(projectPath)

  // Check if directory exists
  if (await exists(projectPath)) {
    const overwrite = await confirm({
      message: `Directory ${c.bold(displayName)} already exists. Overwrite?`,
      defaultValue: false
    })

    if (!overwrite) {
      console.log(`${c.muted(symbols.cross)} Cancelled`)
      return
    }
  }

  console.log()

  // Create project
  const spin = spinner('Creating project structure...')

  try {
    // Create directories
    await mkdir(join(projectPath, 'src', 'components'), { recursive: true })

    // Write files using Bun.write (faster than fs.writeFile)
    await Promise.all([
      Bun.write(join(projectPath, 'package.json'), PACKAGE_JSON(displayName)),
      Bun.write(join(projectPath, 'bunfig.toml'), BUNFIG_TOML),
      Bun.write(join(projectPath, 'tsconfig.json'), TSCONFIG_JSON),
      Bun.write(join(projectPath, '.gitignore'), GITIGNORE),
      Bun.write(join(projectPath, 'README.md'), README(displayName)),
      Bun.write(join(projectPath, 'src', 'main.ts'), MAIN_TS),
      Bun.write(join(projectPath, 'src', 'App.tui'), APP_TUI),
      Bun.write(join(projectPath, 'src', 'components', 'Counter.tui'), COUNTER_TUI),
    ])

    spin.stop('Project structure created')

    // Install dependencies using Bun shell
    const installSpin = spinner('Installing dependencies...')

    try {
      await $`cd ${projectPath} && bun install`.quiet()
      installSpin.stop('Dependencies installed')
    } catch {
      installSpin.stop()
      console.log(`${c.warning(symbols.bullet)} Run ${c.info('bun install')} manually to install dependencies`)
    }

    // Success!
    console.log()
    console.log(box([
      `${c.success(symbols.check)} ${c.bold('Project created!')}`,
      '',
      `${c.dim('Next steps:')}`,
      '',
      `  ${c.muted('$')} ${c.info(`cd ${displayName}`)}`,
      `  ${c.muted('$')} ${c.info('bun run dev')}`,
      '',
      c.dim('Happy hacking!'),
    ], { title: ` ${symbols.star} Success `, padding: 1 }))
    console.log()

  } catch (error) {
    spin.stop()
    throw error
  }
}

// Template files

const PACKAGE_JSON = (name: string) => `{
  "name": "${name}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/main.ts",
    "build": "bun build src/main.ts --outfile dist/main.js --target bun"
  },
  "dependencies": {
    "@rlabs-inc/tui": "latest",
    "@rlabs-inc/signals": "latest"
  },
  "devDependencies": {
    "@rlabs-inc/tui-compiler": "latest",
    "@types/bun": "latest",
    "typescript": "^5.0.0"
  }
}
`

const BUNFIG_TOML = `# TUI Framework configuration
# The compiler plugin enables .tui file imports

preload = ["@rlabs-inc/tui-compiler/register"]
`

const TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`

const GITIGNORE = `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Debug
*.log
`

const README = (name: string) => `# ${name}

A TUI Framework application.

## Getting Started

\`\`\`bash
# Run in development
bun run dev

# Build for production
bun run build
\`\`\`

## Project Structure

\`\`\`
${name}/
├── src/
│   ├── main.ts           # Entry point
│   ├── App.tui           # Root component
│   └── components/       # Reusable components
│       └── Counter.tui
├── bunfig.toml           # Bun configuration (enables .tui compiler)
├── package.json
└── tsconfig.json
\`\`\`

## Learn More

- [TUI Framework Documentation](https://github.com/rlabs-inc/tui)
- [Signals Library](https://github.com/rlabs-inc/signals)
`

const MAIN_TS = `/**
 * TUI Application Entry Point
 */

import '@rlabs-inc/tui-compiler/register'
import { mount, keyboard } from '@rlabs-inc/tui'
import App from './App.tui'

async function main() {
  // Mount the application
  const cleanup = await mount(() => {
    App()
  })

  // Handle exit (q or Ctrl+C)
  keyboard.on((event) => {
    if (event.key === 'q' || (event.modifiers.ctrl && event.key === 'c')) {
      cleanup().then(() => process.exit(0))
    }
  })
}

main().catch(console.error)
`

const APP_TUI = `<script lang="ts">
  import Counter from './components/Counter.tui'
</script>

<box
  width="100%"
  height="100%"
  flexDirection="column"
  justifyContent="center"
  alignItems="center"
  gap={2}
>
  <text variant="accent">Welcome to TUI Framework</text>
  <Counter />
  <text variant="muted">Press Q to quit</text>
</box>
`

const COUNTER_TUI = `<script lang="ts">
  const count = signal(0)

  keyboard.onKey(['+', '=', 'ArrowUp'], () => count.value++)
  keyboard.onKey(['-', '_', 'ArrowDown'], () => count.value--)
  keyboard.onKey('r', () => count.value = 0)
</script>

<box
  border={1}
  borderColor={t.primary}
  padding={1}
  flexDirection="column"
  alignItems="center"
  gap={1}
>
  <text fg={t.accent}>Counter</text>
  <text fg={t.textBright}>{count}</text>
  <text fg={t.textMuted}>[+/-] change  [r] reset</text>
</box>
`
