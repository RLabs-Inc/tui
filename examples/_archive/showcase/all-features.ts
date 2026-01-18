/**
 * TUI Framework - Comprehensive Showcase
 *
 * demonstratest:
 * - Layout (Flexbox, Grid-like wrapping)
 * - Interactivity (Focus, Keyboard, Mouse)
 * - Reactivity (Signals, Deriveds)
 * - Theming (Variants, Dynamic switching)
 * - Scrolling & Clipping
 * - Absolute Positioning (Overlays)
 */

import {
  mount,
  box,
  text,
  signal,
  derived,
  effect,
  keyboard,
  mouse,
  theme,
  t,
  setTheme,
  BorderStyle,
  type Variant
} from '../../index'
// import { getSource } from '@rlabs-inc/signals'

// State
const activeTab = signal('dashboard')
const count = signal(0)
const inputText = signal('')
const showModal = signal(false)
const notification = signal<string | null>(null)

// DEBUG: Auto-increment counter to test reactivity
setInterval(() => {
  count.value++
  console.error(`[auto] count=${count.value}`)
}, 500)

// Computed
const doubleCount = derived(() => count.value * 2)
const debugCountText = derived(() => `DEBUG COUNT: ${count.value}`)

// DEBUG: Auto-cycling color to test if colors unlock reactivity
const debugColor = signal({ r: 255, g: 0, b: 0, a: 255 })
const colorCycle = [
  { r: 255, g: 0, b: 0, a: 255 },
  { r: 0, g: 255, b: 0, a: 255 },
  { r: 0, g: 0, b: 255, a: 255 },
]
let colorIdx = 0
setInterval(() => {
  colorIdx = (colorIdx + 1) % colorCycle.length
  debugColor.value = colorCycle[colorIdx]!
}, 750)

// Helper for notifications
function notify(msg: string) {
  notification.value = msg
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

// Components
function Button(props: {
  label: string | (() => string),
  onClick: () => void,
  variant?: Variant,
  width?: number | string
}) {
  const isHovered = signal(false)
  const isFocused = signal(false)
  
  // Dynamic variant based on state
  const currentVariant = derived(() => {
    if (isFocused.value) return 'primary'
    if (isHovered.value) return 'elevated'
    return props.variant || 'surface'
  })

  // Box with interaction handlers
  box({
    width: props.width ?? '100%',
    height: 3,
    border: BorderStyle.ROUNDED,
    variant: currentVariant,
    focusable: true,
    justifyContent: 'center',
    alignItems: 'center',
    
    // Mouse interaction
    // Note: We need to expose mouse events on box prop types in the future
    // For now we rely on the fact that boxes register in hit grid
    
    children: () => {
      text({ 
        content: props.label,
        variant: currentVariant 
      })
    }
  })
}

function SidebarItem(id: string, label: string) {
  const isActive = derived(() => activeTab.value === id)
  
  box({
    width: '100%',
    height: 1,
    paddingLeft: 1,
    margin: 0,
    focusable: true,
    children: () => {
      text({
        content: () => (isActive.value ? `> ${label}` : `  ${label}`),
        // Use theme colors directly
        fg: () => isActive.value ? t.primary : t.textMuted,
      })
    }
  })
}

// Main App
async function main() {
  console.log('Mounting showcase...')
  
  const cleanup = await mount(() => {
    // Root Container
    box({
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      bg: t.bg,
      fg: t.text,
      children: () => {
        // TEST: Root-level counter (not nested)
        text({ content: count, fg: { r: 255, g: 255, b: 0, a: 255 } })

        // =====================================================================
        // SIDEBAR
        // =====================================================================
        box({
          width: 25,
          height: '100%',
          borderRight: 1,
          borderColor: t.border,
          flexDirection: 'column',
          padding: 1,
          gap: 1,
          children: () => {
            text({ 
              content: ' TUI FRAMEWORK ', 
              align: 'center', 
              variant: 'primary',
              
            })
            
            box({ height: 1 }) // Spacer
            
            SidebarItem('dashboard', 'Dashboard')
            SidebarItem('widgets', 'Widgets')
            SidebarItem('settings', 'Settings')
            
            box({ grow: 1 }) // Spacer
            
            // Theme Switcher Info
            box({
              borderTop: 1,
              borderColor: t.border,
              paddingTop: 1,
              flexDirection: 'column',
              children: () => {
                text({ content: 'THEMES (Press T):', variant: 'muted' })
                text({ content: () => `Current: ${theme.name}`, variant: 'info' })
              }
            })
          }
        })

        // =====================================================================
        // MAIN CONTENT
        // =====================================================================
        box({
          grow: 1,
          height: '100%',
          flexDirection: 'column',
          children: () => {

            // DEBUG: Simple counter at top level - does this update?
            box({
              height: 2,
              shrink: 0,  // Don't shrink this!
              bg: { r: 255, g: 0, b: 0, a: 255 },
              children: () => {
                text({ content: debugCountText })
              }
            })

            // Header
            box({
              width: '100%',
              height: 3,
              borderBottom: 1,
              borderColor: t.border,
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingLeft: 2,
              paddingRight: 2,
              children: () => {
                text({ 
                  content: () => 'Section: ' + activeTab.value.toUpperCase(),
                  variant: 'surface',
                  
                })
                
                text({
                  content: () => `Count: ${count.value} | Double: ${doubleCount.value}`,
                  variant: 'accent'
                })
              }
            })

            // Scrollable Area
            box({
              grow: 1,
              width: '100%',
              overflow: 'scroll',
              padding: 1,
              flexDirection: 'column',
              gap: 1,
              children: () => {
                
                // 1. Feature Highlights Grid
                text({ content: 'Features', variant: 'primary'})
                
                box({
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 1,
                  children: () => {
                    // Feature Cards
                    const features = ['Zero Reconciliation', 'Titan Layout', 'ECS Architecture', 'Signals']
                    
                    features.forEach(f => {
                      box({
                        width: 20,
                        height: 5,
                        border: BorderStyle.ROUNDED,
                        borderColor: t.border,
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        children: () => {
                          text({ content: f, align: 'center', fg: t.secondary })
                        }
                      })
                    })
                  }
                })

                box({ height: 1 })

                // 2. Interactive Counter
                text({ content: 'Interactivity', variant: 'primary' })
                
                box({
                  width: '100%',
                  height: 6,
                  border: 1,
                  borderColor: t.border,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  children: () => {
                    text({ content: 'Press SPACE to increment' })
                    
                    box({
                      width: 10,
                      height: 3,
                      border: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      variant: 'primary',
                      children: () => {
                        text({ content: () => count.value })
                      }
                    })
                  }
                })

                box({ height: 1 })

                // 3. Colors & Variants
                text({ content: 'Theming System', variant: 'primary'})
                
                box({
                  flexDirection: 'row',
                  gap: 1,
                  children: () => {
                    const variants: Variant[] = ['primary', 'secondary', 'success', 'warning', 'error']
                    variants.forEach(v => {
                      box({
                        width: 12,
                        height: 3,
                        variant: v,
                        justifyContent: 'center',
                        alignItems: 'center',
                        children: () => {
                          text({ content: v })
                        }
                      })
                    })
                  }
                })
                
                box({ height: 1 })

                // 4. Long Content (Scrolling)
                text({ content: 'Performance (Scrolling)', variant: 'primary'})
                
                // Generate 50 items
                for (let i = 0; i < 50; i++) {
                   box({
                     width: '100%',
                     height: 1,
                     children: () => {
                       text({ 
                         content: () => `Item ${i} - ${'|'.repeat(i % 10)}`, 
                         fg: i % 2 === 0 ? t.textDim : t.text 
                       })
                     }
                   })
                }
              }
            })
          }
        })

        // =====================================================================
        // OVERLAY (Notification)
        // =====================================================================
        box({
          position: 'absolute',
          top: 1,
          right: 2,
          width: 30,
          height: 3,
          zIndex: 100,
          visible: () => notification.value !== null,
          variant: 'success',
          border: BorderStyle.ROUNDED,
          justifyContent: 'center',
          alignItems: 'center',
          children: () => {
            text({ content: () => notification.value || '' })
          }
        })
        
        // =====================================================================
        // MODAL
        // =====================================================================
        box({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 200,
          visible: showModal,
          justifyContent: 'center',
          alignItems: 'center',
          bg: { r: 0, g: 0, b: 0, a: 150 }, // Semi-transparent dim
          children: () => {
            box({
              width: 40,
              height: 10,
              border: BorderStyle.DOUBLE,
              variant: 'surface',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
              children: () => {
                text({ content: 'MODAL DIALOG', variant: 'primary'})
                text({ content: 'Press ESC to close' })
              }
            })
          }
        })
      }
    })
  }, {mode: 'inline', mouse: false})  // TEMP: testing if mouse breaks reactivity

  // Global Key Handlers
  keyboard.on((e) => {
    // Quit
    if (e.key === 'q' && !inputText.value) {
      cleanup().then(() => process.exit(0))
    }
    
    // Theme Switcher
    if (e.key === 't') {
      const names = ['terminal', 'dracula', 'nord', 'monokai', 'solarized']
      const currentIdx = names.indexOf(theme.name)
      const next = names[(currentIdx + 1) % names.length]
      setTheme(next as any)
      notify(`Theme switched to: ${next}`)
    }
    
    // Counter
    if (e.key === 'Space') {
      count.value++
    }
    
    // Modal toggle
    if (e.key === 'm') {
      showModal.value = true
    }
    if (e.key === 'Escape') {
      showModal.value = false
    }
    
    // Tabs
    if (e.key === '1') activeTab.value = 'dashboard'
    if (e.key === '2') activeTab.value = 'widgets'
    if (e.key === '3') activeTab.value = 'settings'
  })

  // DISABLED for debugging - notify might be breaking dependency chain
  // setTimeout(() => {
  //   notify('Welcome! Press T for themes, M for modal')
  // }, 100)

  // Auto-increment to test reactivity
  setInterval(() => {
    count.value++
  }, 1000)
}

main().catch(console.error)