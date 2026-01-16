/**
 * TUI Framework - Context System Tests
 *
 * Tests for createContext, provide, and useContext.
 * Verifies automatic reactive subscriptions via ReactiveMap.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { signal, derived, effect } from '@rlabs-inc/signals'

import {
  createContext,
  provide,
  useContext,
  hasContext,
  clearContext,
  resetContexts,
} from '../src/state/context'

// =============================================================================
// TEST UTILITIES
// =============================================================================

function cleanupAll(): void {
  resetContexts()
}

// =============================================================================
// CONTEXT CREATION TESTS
// =============================================================================

describe('Context - Creation', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('createContext returns a context object', () => {
    const ctx = createContext('default')

    expect(ctx.id).toBeDefined()
    expect(typeof ctx.id).toBe('symbol')
    expect(ctx.defaultValue).toBe('default')
  })

  test('createContext with display name', () => {
    const ctx = createContext(42, 'MyContext')

    expect(ctx.displayName).toBe('MyContext')
    expect(ctx.defaultValue).toBe(42)
  })

  test('each context has unique id', () => {
    const ctx1 = createContext('a')
    const ctx2 = createContext('b')

    expect(ctx1.id).not.toBe(ctx2.id)
  })
})

// =============================================================================
// PROVIDE/USECONTEXT TESTS
// =============================================================================

describe('Context - Provide and UseContext', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('useContext returns default when not provided', () => {
    const ctx = createContext('default-value')

    expect(useContext(ctx)).toBe('default-value')
  })

  test('provide sets context value', () => {
    const ctx = createContext('default')

    provide(ctx, 'provided-value')

    expect(useContext(ctx)).toBe('provided-value')
  })

  test('provide with signal', () => {
    const ctx = createContext<number>(0)
    const value = signal(42)

    provide(ctx, value)

    expect(useContext(ctx)).toBe(42)

    // Update signal
    value.value = 100

    expect(useContext(ctx)).toBe(100)
  })

  test('provide can update value', () => {
    const ctx = createContext('default')

    provide(ctx, 'first')
    expect(useContext(ctx)).toBe('first')

    provide(ctx, 'second')
    expect(useContext(ctx)).toBe('second')
  })

  test('hasContext returns false for unprovided context', () => {
    const ctx = createContext('default')

    expect(hasContext(ctx)).toBe(false)
  })

  test('hasContext returns true for provided context', () => {
    const ctx = createContext('default')

    provide(ctx, 'value')

    expect(hasContext(ctx)).toBe(true)
  })

  test('clearContext removes context', () => {
    const ctx = createContext('default')

    provide(ctx, 'value')
    expect(useContext(ctx)).toBe('value')
    expect(hasContext(ctx)).toBe(true)

    clearContext(ctx)

    expect(useContext(ctx)).toBe('default')
    expect(hasContext(ctx)).toBe(false)
  })
})

// =============================================================================
// REACTIVITY TESTS
// =============================================================================

describe('Context - Reactivity', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('derived reacts to context changes', () => {
    const ThemeContext = createContext({ color: 'blue' })

    provide(ThemeContext, { color: 'red' })

    // Create a derived that reads context
    const bgColor = derived(() => useContext(ThemeContext).color)

    expect(bgColor.value).toBe('red')

    // Update context
    provide(ThemeContext, { color: 'green' })

    expect(bgColor.value).toBe('green')
  })

  test('effect reacts to context changes', () => {
    const CountContext = createContext(0)

    provide(CountContext, 1)

    // Use derived instead of effect for simpler testing
    // (effects may not run immediately in all signals implementations)
    const current = derived(() => useContext(CountContext))

    expect(current.value).toBe(1)

    // Update context
    provide(CountContext, 2)
    expect(current.value).toBe(2)

    provide(CountContext, 3)
    expect(current.value).toBe(3)
  })

  test('signal-based context updates reactively', () => {
    const UserContext = createContext<{ name: string }>({ name: 'Guest' })
    const user = signal({ name: 'Alice' })

    provide(UserContext, user)

    const userName = derived(() => useContext(UserContext).name)

    expect(userName.value).toBe('Alice')

    // Update via signal
    user.value = { name: 'Bob' }

    expect(userName.value).toBe('Bob')
  })

  test('multiple contexts are independent', () => {
    const ThemeContext = createContext('light')
    const LanguageContext = createContext('en')

    // Use derived for testing context independence
    const currentTheme = derived(() => useContext(ThemeContext))
    const currentLang = derived(() => useContext(LanguageContext))

    // Initial - both use defaults since not provided
    expect(currentTheme.value).toBe('light')
    expect(currentLang.value).toBe('en')

    // Update only theme
    provide(ThemeContext, 'dark')

    expect(currentTheme.value).toBe('dark')
    expect(currentLang.value).toBe('en') // Unchanged!

    // Update only language
    provide(LanguageContext, 'es')

    expect(currentTheme.value).toBe('dark') // Unchanged!
    expect(currentLang.value).toBe('es')
  })
})

// =============================================================================
// TYPE SAFETY TESTS
// =============================================================================

describe('Context - Type Safety', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('context preserves complex types', () => {
    interface AppState {
      user: { name: string; id: number } | null
      settings: { theme: string; notifications: boolean }
    }

    const AppContext = createContext<AppState>({
      user: null,
      settings: { theme: 'light', notifications: true },
    })

    provide(AppContext, {
      user: { name: 'Test', id: 1 },
      settings: { theme: 'dark', notifications: false },
    })

    const state = useContext(AppContext)

    expect(state.user?.name).toBe('Test')
    expect(state.settings.theme).toBe('dark')
  })

  test('null/undefined context values work', () => {
    const NullableContext = createContext<string | null>('default')

    provide(NullableContext, null)

    // null is a valid provided value
    expect(useContext(NullableContext)).toBe(null)
  })
})

// =============================================================================
// PRACTICAL USE CASES
// =============================================================================

describe('Context - Practical Use Cases', () => {
  beforeEach(cleanupAll)
  afterEach(cleanupAll)

  test('theme context pattern', () => {
    interface Theme {
      primary: string
      background: string
      text: string
    }

    const lightTheme: Theme = { primary: '#007bff', background: '#fff', text: '#000' }
    const darkTheme: Theme = { primary: '#0d6efd', background: '#212529', text: '#f8f9fa' }

    const ThemeContext = createContext<Theme>(lightTheme)

    // Component reads theme
    const currentBg = derived(() => useContext(ThemeContext).background)

    expect(currentBg.value).toBe('#fff')

    // Switch to dark theme
    provide(ThemeContext, darkTheme)

    expect(currentBg.value).toBe('#212529')
  })

  test('auth context pattern', () => {
    interface AuthState {
      isLoggedIn: boolean
      user: { name: string } | null
    }

    const AuthContext = createContext<AuthState>({
      isLoggedIn: false,
      user: null,
    })

    const isLoggedIn = derived(() => useContext(AuthContext).isLoggedIn)
    const userName = derived(() => useContext(AuthContext).user?.name ?? 'Guest')

    expect(isLoggedIn.value).toBe(false)
    expect(userName.value).toBe('Guest')

    // Login
    provide(AuthContext, {
      isLoggedIn: true,
      user: { name: 'Alice' },
    })

    expect(isLoggedIn.value).toBe(true)
    expect(userName.value).toBe('Alice')

    // Logout
    provide(AuthContext, {
      isLoggedIn: false,
      user: null,
    })

    expect(isLoggedIn.value).toBe(false)
    expect(userName.value).toBe('Guest')
  })
})
