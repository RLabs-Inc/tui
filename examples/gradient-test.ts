/**
 * OKLCH Gradient Test
 *
 * Demonstrates the beautiful rainbow gradient using OKLCH colors.
 * OKLCH provides perceptually uniform color transitions.
 */

import { mount, keyboard } from '../src/api/mount'
import { box, text } from '../src/primitives'
import { oklch, Colors } from '../src/types/color'
import { signal } from '@rlabs-inc/signals'

async function main() {
  // Get terminal size
  const width = process.stdout.columns || 80
  const height = process.stdout.rows || 24

  // Create a gradient bar using OKLCH
  // The key values: L=0.7 (brightness), C=0.15 (saturation)
  const gradientColors: string[] = []
  for (let x = 0; x < width; x++) {
    const hue = (x / width) * 360
    const color = oklch(0.7, 0.15, hue)
    // Convert to hex for text content
    const hex = `#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`
    gradientColors.push(hex)
  }

  const cleanup = await mount(
    () => {
      // Main container
      box({
        width: width,
        height: height,
        flexDirection: 'column',
        children: () => {
          // Gradient bar at top - using boxes with background colors
          box({
            width: width,
            height: 1,
            flexDirection: 'row',
            children: () => {
              // Create a box for each column with OKLCH color
              for (let x = 0; x < Math.min(width, 80); x++) {
                const hue = (x / 80) * 360
                const color = oklch(0.7, 0.15, hue)
                box({
                  width: 1,
                  height: 1,
                  bg: color,
                })
              }
            },
          })

          // Info text
          box({
            width: width,
            height: 3,
            padding: 1,
            children: () => {
              text({
                content: 'OKLCH Rainbow Gradient - L=0.7, C=0.15, H=0-360',
                fg: Colors.WHITE,
              })
            },
          })

          // Second gradient with different parameters
          box({
            width: width,
            height: 1,
            flexDirection: 'row',
            children: () => {
              for (let x = 0; x < Math.min(width, 80); x++) {
                const hue = (x / 80) * 360
                const color = oklch(0.85, 0.2, hue)  // Brighter, more saturated
                box({
                  width: 1,
                  height: 1,
                  bg: color,
                })
              }
            },
          })

          box({
            width: width,
            height: 3,
            padding: 1,
            children: () => {
              text({
                content: 'Brighter variant - L=0.85, C=0.2, H=0-360',
                fg: Colors.WHITE,
              })
            },
          })

          // Third gradient - darker, muted
          box({
            width: width,
            height: 1,
            flexDirection: 'row',
            children: () => {
              for (let x = 0; x < Math.min(width, 80); x++) {
                const hue = (x / 80) * 360
                const color = oklch(0.5, 0.1, hue)  // Darker, more muted
                box({
                  width: 1,
                  height: 1,
                  bg: color,
                })
              }
            },
          })

          box({
            width: width,
            height: 3,
            padding: 1,
            children: () => {
              text({
                content: 'Muted variant - L=0.5, C=0.1, H=0-360',
                fg: Colors.WHITE,
              })
            },
          })

          // Instructions
          box({
            width: width,
            height: 2,
            padding: 1,
            children: () => {
              text({
                content: 'Press Ctrl+C to exit',
                fg: Colors.GRAY,
              })
            },
          })
        },
      })
    },
    { mode: 'fullscreen' }
  )

  keyboard.setExitOnCtrlC(true); // cleanup)
}

main().catch(console.error)
