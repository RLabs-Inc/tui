# Modals & Overlays Guide

> Modal dialogs and focus trapping

## Overview

Modals and overlays are common UI patterns. This guide covers:

- Creating modal dialogs
- Focus trapping
- Overlay positioning
- Keyboard handling (Escape to close)

## Basic Modal

```typescript
import { signal, derived, box, text, show, keyboard, Attr, t, BorderStyle, focusManager } from '@rlabs-inc/tui'

const isModalOpen = signal(false)

// Main content
box({
  children: () => {
    text({ content: 'Main application content' })
    text({ content: 'Press M to open modal', fg: t.textDim })
  }
})

// Modal overlay
show(
  () => isModalOpen.value,
  () => box({
    zIndex: 100,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    bg: { r: 0, g: 0, b: 0, a: 128 },  // Semi-transparent overlay
    children: () => {
      box({
        width: 40,
        border: BorderStyle.DOUBLE,
        borderColor: t.primary,
        bg: t.background,
        padding: 2,
        gap: 1,
        children: () => {
          text({ content: 'Modal Title', fg: t.primary, attrs: Attr.BOLD })
          text({ content: 'This is modal content.' })
          text({ content: 'Press Escape to close.', fg: t.textDim })
        }
      })
    }
  })
)

// Open modal
keyboard.onKey('m', () => {
  isModalOpen.value = true
})

// Close modal with Escape
keyboard.onKey('Escape', () => {
  if (isModalOpen.value) {
    isModalOpen.value = false
    return true  // Consume event
  }
})
```

## Modal with Focus Trapping

Prevent focus from leaving the modal using `pushFocusTrap` and `popFocusTrap`:

```typescript
import { signal, box, text, show, focusManager, pushFocusTrap, popFocusTrap, BorderStyle, t } from '@rlabs-inc/tui'

const isModalOpen = signal(false)

function openModal() {
  isModalOpen.value = true
  // Focus trapping is set up inside the modal component when it mounts
}

function closeModal() {
  popFocusTrap()  // Release trap
  focusManager.restoreFocusFromHistory()
  isModalOpen.value = false
}

show(
  () => isModalOpen.value,
  () => box({
    zIndex: 100,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    bg: { r: 0, g: 0, b: 0, a: 128 },
    children: () => {
      // Modal dialog - this box will be the focus trap container
      box({
        width: 40,
        border: BorderStyle.DOUBLE,
        borderColor: t.primary,
        bg: t.background,
        padding: 2,
        gap: 1,
        children: () => {
          text({ content: 'Modal Title', fg: t.primary })

          // Focusable buttons inside modal
          box({
            flexDirection: 'row',
            gap: 2,
            children: () => {
              box({
                focusable: true,
                tabIndex: 1,
                border: BorderStyle.ROUNDED,
                paddingLeft: 2,
                paddingRight: 2,
                onKey: (e) => {
                  if (e.key === 'Enter') {
                    closeModal()
                    return true
                  }
                },
                children: () => text({ content: 'OK' })
              })
              box({
                focusable: true,
                tabIndex: 2,
                border: BorderStyle.ROUNDED,
                paddingLeft: 2,
                paddingRight: 2,
                onKey: (e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    closeModal()
                    return true
                  }
                },
                children: () => text({ content: 'Cancel' })
              })
            }
          })
        }
      })
    }
  })
)
```

## Confirmation Dialog

```typescript
import { signal, derived, box, text, keyboard, BorderStyle, Attr, t, type Cleanup } from '@rlabs-inc/tui'

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog(props: ConfirmDialogProps): Cleanup {
  const selectedButton = signal<'confirm' | 'cancel'>('cancel')

  // NOTE: keyboard.on() is the correct choice for modal dialogs!
  // Unlike box.onKey (which only fires when focused), keyboard.on()
  // captures ALL keyboard input globally. This is what modals need -
  // they should intercept all keys while open, regardless of focus.
  // The handler is automatically cleaned up when this component is destroyed.
  keyboard.on((event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      selectedButton.value = selectedButton.value === 'confirm' ? 'cancel' : 'confirm'
      return true
    }
    if (event.key === 'Enter') {
      if (selectedButton.value === 'confirm') {
        props.onConfirm()
      } else {
        props.onCancel()
      }
      return true
    }
    if (event.key === 'Escape') {
      props.onCancel()
      return true
    }
  })

  return box({
    zIndex: 100,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    bg: { r: 0, g: 0, b: 0, a: 150 },
    children: () => {
      box({
        width: 50,
        border: BorderStyle.DOUBLE,
        borderColor: t.warning,
        bg: t.background,
        padding: 2,
        gap: 2,
        children: () => {
          text({ content: props.title, fg: t.warning, attrs: Attr.BOLD })
          text({ content: props.message })

          // Buttons
          box({
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 2,
            children: () => {
              box({
                border: BorderStyle.ROUNDED,
                paddingLeft: 2,
                paddingRight: 2,
                bg: derived(() =>
                  selectedButton.value === 'cancel' ? t.surface.value : null
                ),
                children: () => text({ content: 'Cancel' })
              })
              box({
                border: BorderStyle.ROUNDED,
                paddingLeft: 2,
                paddingRight: 2,
                bg: derived(() =>
                  selectedButton.value === 'confirm' ? t.error.value : null
                ),
                children: () => text({
                  content: 'Confirm',
                  fg: derived(() =>
                    selectedButton.value === 'confirm' ? t.background.value : t.error.value
                  )
                })
              })
            }
          })
        }
      })
    }
  })
}

// Usage
const showConfirm = signal(false)

show(
  () => showConfirm.value,
  () => ConfirmDialog({
    title: 'Delete Item?',
    message: 'This action cannot be undone.',
    onConfirm: () => {
      deleteItem()
      showConfirm.value = false
    },
    onCancel: () => {
      showConfirm.value = false
    }
  })
)
```

## Toast / Notification

```typescript
import { signal, box, text, each, BorderStyle, t } from '@rlabs-inc/tui'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = signal<Toast[]>([])

function showToast(message: string, type: Toast['type'] = 'info') {
  const id = Date.now().toString()
  toasts.value = [...toasts.value, { id, message, type }]

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

// Toast container (bottom right)
box({
  zIndex: 100,
  // Position at bottom right would need absolute positioning
  // For now, use a fixed position in your layout
  children: () => {
    each(
      () => toasts.value,
      (getToast, key) => {
        const toast = getToast()
        const colors = {
          success: t.success,
          error: t.error,
          info: t.info
        }

        return box({
          border: BorderStyle.ROUNDED,
          borderColor: colors[toast.type],
          bg: t.surface,
          padding: 1,
          marginBottom: 1,
          children: () => {
            text({ content: toast.message })
          }
        })
      },
      { key: toast => toast.id }
    )
  }
})
```

## Dropdown Menu

```typescript
import { signal, derived, box, text, show, each, keyboard, BorderStyle, t } from '@rlabs-inc/tui'

const isDropdownOpen = signal(false)
const selectedOption = signal(0)
const options = signal(['Option 1', 'Option 2', 'Option 3'])

box({
  focusable: true,
  tabIndex: 1,
  onKey: (event) => {
    if (event.key === 'Enter') {
      isDropdownOpen.value = !isDropdownOpen.value
      return true
    }
    if (event.key === 'Escape' && isDropdownOpen.value) {
      isDropdownOpen.value = false
      return true
    }
    if (event.key === 'ArrowDown' && isDropdownOpen.value) {
      selectedOption.value = Math.min(selectedOption.value + 1, options.value.length - 1)
      return true
    }
    if (event.key === 'ArrowUp' && isDropdownOpen.value) {
      selectedOption.value = Math.max(selectedOption.value - 1, 0)
      return true
    }
  },
  children: () => {
    // Trigger button
    box({
      border: BorderStyle.ROUNDED,
      paddingLeft: 1,
      paddingRight: 1,
      children: () => {
        text({ content: () => `Selected: ${options.value[selectedOption.value]} ▼` })
      }
    })

    // Dropdown menu
    show(
      () => isDropdownOpen.value,
      () => box({
        zIndex: 10,
        border: BorderStyle.SINGLE,
        bg: t.surface,
        children: () => {
          each(
            () => options.value,
            (getOption, key) => {
              const index = parseInt(key)
              return box({
                paddingLeft: 1,
                paddingRight: 1,
                bg: derived(() => selectedOption.value === index ? t.primary.value : null),
                children: () => text({
                  content: getOption,
                  fg: derived(() => selectedOption.value === index ? t.background.value : t.text.value)
                })
              })
            },
            { key: (_, i) => String(i) }
          )
        }
      })
    )
  }
})
```

## Sidebar Overlay

```typescript
import { signal, box, text, show, BorderStyle, t } from '@rlabs-inc/tui'

const isSidebarOpen = signal(false)

box({
  focusable: true,
  tabIndex: 1,
  flexDirection: 'row',
  width: '100%',
  height: '100%',
  onKey: (event) => {
    if (event.key === 's') {
      isSidebarOpen.value = !isSidebarOpen.value
      return true
    }
  },
  children: () => {
    // Sidebar
    show(
      () => isSidebarOpen.value,
      () => box({
        width: 30,
        height: '100%',
        border: BorderStyle.SINGLE,
        borderColor: t.border,
        bg: t.surface,
        padding: 1,
        children: () => {
          text({ content: 'Sidebar', fg: t.primary })
          text({ content: 'Press S to close', fg: t.textDim })
        }
      })
    )

    // Main content
    box({
      grow: 1,
      children: () => {
        text({ content: 'Main Content' })
        text({ content: 'Press S to toggle sidebar', fg: t.textDim })
      }
    })
  }
})
```

## Best Practices

1. **Always handle Escape** - Users expect Escape to close modals
2. **Trap focus** - Prevent focus from leaving modal
3. **Save and restore focus** - Return to previous element on close
4. **Use z-index** - Ensure modals appear above content
5. **Semi-transparent overlay** - Indicate modal context
6. **Clear actions** - Make it obvious how to dismiss

## See Also

- [Focus Guide](../state/focus.md)
- [Keyboard Guide](../state/keyboard.md)
- [Component Patterns](./component-patterns.md)
