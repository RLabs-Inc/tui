# when()

> Async/promise rendering primitive

## Import

```typescript
import { when } from '@rlabs-inc/tui'
```

## Signature

```typescript
function when<T>(
  source: () => Promise<T>,
  handlers: WhenHandlers<T>
): Cleanup
```

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `source` | `() => Promise<T>` | Getter returning promise |
| `handlers` | `WhenHandlers<T>` | State handlers |

### WhenHandlers

| Handler | Type | Description |
|---------|------|-------------|
| `pending` | `() => Cleanup` | Shown while promise is pending |
| `then` | `(data: T) => Cleanup` | Shown when promise resolves |
| `catch` | `(error: Error) => Cleanup` | Shown when promise rejects |

## Returns

```typescript
type Cleanup = () => void
```

## Examples

### Basic Async Data

```typescript
import { when, text, box } from '@rlabs-inc/tui'

async function fetchUser(): Promise<User> {
  const res = await fetch('/api/user')
  return res.json()
}

when(
  () => fetchUser(),
  {
    pending: () => text({ content: 'Loading user...' }),
    then: (user) => text({ content: `Hello, ${user.name}!` }),
    catch: (err) => text({ content: `Error: ${err.message}`, fg: t.error })
  }
)
```

### With Loading Spinner

```typescript
when(
  () => loadData(),
  {
    pending: () => box({
      flexDirection: 'row',
      gap: 1,
      children: () => {
        Spinner()
        text({ content: 'Loading...' })
      }
    }),
    then: (data) => DataView({ data }),
    catch: (err) => ErrorView({ error: err })
  }
)
```

### Re-fetching on Signal Change

```typescript
const userId = signal(1)

when(
  () => fetchUser(userId.value),  // Re-runs when userId changes
  {
    pending: () => text({ content: 'Loading...' }),
    then: (user) => UserCard({ user }),
    catch: (err) => text({ content: err.message, fg: t.error })
  }
)

// Change userId to trigger refetch
userId.value = 2
```

### Chained Async

```typescript
const selectedId = signal<string | null>(null)

show(
  () => selectedId.value !== null,
  () => when(
    () => fetchDetails(selectedId.value!),
    {
      pending: () => text({ content: 'Loading details...' }),
      then: (details) => DetailsPanel({ details }),
      catch: (err) => text({ content: 'Failed to load details' })
    }
  )
)
```

### With Retry

```typescript
const retryCount = signal(0)

when(
  () => {
    retryCount.value  // Track for re-fetch
    return fetchData()
  },
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => DataView({ data }),
    catch: (err) => box({
      children: () => {
        text({ content: `Error: ${err.message}`, fg: t.error })
        text({
          content: '[Press R to retry]',
          fg: t.textMuted
        })
      }
    })
  }
)

keyboard.onKey('r', () => {
  retryCount.value++  // Triggers refetch
})
```

### Multiple Async Sources

```typescript
box({
  children: () => {
    // User data
    when(
      () => fetchUser(),
      {
        pending: () => text({ content: 'Loading user...' }),
        then: (user) => UserSection({ user }),
        catch: (err) => text({ content: 'User load failed' })
      }
    )

    // Posts data (independent)
    when(
      () => fetchPosts(),
      {
        pending: () => text({ content: 'Loading posts...' }),
        then: (posts) => PostsList({ posts }),
        catch: (err) => text({ content: 'Posts load failed' })
      }
    )
  }
})
```

### Timeout Handling

```typescript
function fetchWithTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ])
}

when(
  () => fetchWithTimeout(fetchData(), 5000),
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => DataView({ data }),
    catch: (err) => {
      if (err.message === 'Timeout') {
        return text({ content: 'Request timed out', fg: t.warning })
      }
      return text({ content: err.message, fg: t.error })
    }
  }
)
```

### Cached Data

```typescript
const cache = new Map<string, Data>()

when(
  () => {
    const key = `user-${userId.value}`
    if (cache.has(key)) {
      return Promise.resolve(cache.get(key)!)
    }
    return fetchUser(userId.value).then(data => {
      cache.set(key, data)
      return data
    })
  },
  {
    pending: () => text({ content: 'Loading...' }),
    then: (data) => DataView({ data }),
    catch: (err) => ErrorView({ error: err })
  }
)
```

## Behavior

### State Transitions

```
Initial → pending (promise created)
        ↓
pending → then (promise resolved)
        OR
pending → catch (promise rejected)
```

### Re-execution

The source getter re-runs when any signals it reads change:

```typescript
const filter = signal('all')

when(
  () => fetchItems(filter.value),  // Re-runs when filter changes
  { ... }
)
```

### Cleanup

When component unmounts or source re-runs, previous handlers are cleaned up:

```typescript
when(
  () => fetchData(),
  {
    then: (data) => {
      // Setup
      const interval = setInterval(refresh, 1000)

      // Return cleanup
      return () => {
        clearInterval(interval)
      }
    }
  }
)
```

## Error Handling

### Catch Handler

The catch handler receives the error:

```typescript
when(
  () => mightFail(),
  {
    catch: (err) => {
      // err is the rejected value
      console.error('Failed:', err)
      return ErrorDisplay({ error: err })
    }
  }
)
```

### Without Catch

If no catch handler, errors are swallowed (not recommended):

```typescript
// Not recommended - errors silently ignored
when(
  () => fetchData(),
  {
    pending: () => Loading(),
    then: (data) => DataView({ data })
    // No catch - errors hidden!
  }
)
```

## See Also

- [Template Primitives Guide](../../guides/primitives/template-primitives.md)
- [show()](./show.md)
- [each()](./each.md)
