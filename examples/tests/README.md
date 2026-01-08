# TUI Framework - Feature Tests

Run each test to verify the feature works correctly.

## Test Files

| # | Test | Description | Command |
|---|------|-------------|---------|
| 01 | Box Basics | Borders, padding, backgrounds, nesting | `bun run examples/tests/01-box-basics.ts` |
| 02 | Text Basics | Colors, alignment, numeric content | `bun run examples/tests/02-text-basics.ts` |
| 03 | Layout Flex | Flexbox direction, justify, align, grow | `bun run examples/tests/03-layout-flex.ts` |
| 04 | Borders Complete | ALL 10 border styles, per-side borders | `bun run examples/tests/04-borders-complete.ts` |
| 05 | Flex Complete | ALL flex options exhaustively tested | `bun run examples/tests/05-flex-complete.ts` |
| 06 | Colors & Themes | All colors, RGBA, opacity, inheritance | `bun run examples/tests/06-colors-themes.ts` |
| 07 | Spacing | Padding all/per-side, gap | `bun run examples/tests/07-spacing.ts` |
| 08 | Reactivity | Signals, derived, function getters | `bun run examples/tests/08-reactivity.ts` |

## Run All Tests

```bash
# Run each test interactively (press Q to exit each)
for f in examples/tests/0*.ts; do echo "Running $f"; bun run "$f"; done
```

## Expected Results

Each test should:
- Display without errors
- Show all elements with correct colors
- Text should be visible and properly positioned
- Press Q to exit cleanly
