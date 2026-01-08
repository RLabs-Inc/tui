/**
 * TUI Framework - Layout Math Utilities
 *
 * Integer-only math for terminal cells.
 * No sub-pixel nonsense - terminals work in discrete cells.
 */

/**
 * Clamp a value between min and max.
 * Returns integer.
 */
export function clamp(min: number, value: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Clamp and round to integer.
 * Use at final step when writing to computed arrays.
 */
export function clampInt(min: number, value: number, max: number): number {
  return Math.round(clamp(min, value, max))
}

/**
 * Round to nearest integer.
 * Always round at the end, not during intermediate calculations.
 */
export function round(value: number): number {
  return Math.round(value)
}

/**
 * Floor to integer.
 * Use for flex grow to avoid overflow.
 */
export function floor(value: number): number {
  return Math.floor(value)
}

/**
 * Ceiling to integer.
 * Use for flex shrink to ensure minimum coverage.
 */
export function ceil(value: number): number {
  return Math.ceil(value)
}

/**
 * Check if a number is effectively zero (within epsilon).
 */
export function isZero(value: number, epsilon = 0.001): boolean {
  return Math.abs(value) < epsilon
}

/**
 * Distribute a total amount across N items proportionally.
 * Returns array of integer amounts that sum to exactly `total`.
 *
 * Uses largest remainder method to ensure exact distribution.
 */
export function distributeProportionally(
  total: number,
  weights: number[]
): number[] {
  if (weights.length === 0) return []

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight === 0) {
    // Equal distribution if no weights
    const base = Math.floor(total / weights.length)
    const remainder = total - base * weights.length
    return weights.map((_, i) => base + (i < remainder ? 1 : 0))
  }

  // Calculate exact (floating) shares
  const exact = weights.map(w => (total * w) / totalWeight)

  // Floor each share
  const floored = exact.map(Math.floor)

  // Calculate remainders
  const remainders = exact.map((e, i) => ({
    index: i,
    remainder: e - floored[i]!,
  }))

  // Sort by remainder descending
  remainders.sort((a, b) => b.remainder - a.remainder)

  // Distribute leftover to items with largest remainders
  const distributed = total - floored.reduce((a, b) => a + b, 0)
  for (let i = 0; i < distributed; i++) {
    floored[remainders[i]!.index]!++
  }

  return floored
}

/**
 * Sum an array of numbers.
 */
export function sum(arr: number[]): number {
  let total = 0
  for (let i = 0; i < arr.length; i++) {
    total += arr[i]!
  }
  return total
}

/**
 * Find maximum in an array.
 */
export function max(arr: number[]): number {
  if (arr.length === 0) return 0
  let m = arr[0]!
  for (let i = 1; i < arr.length; i++) {
    if (arr[i]! > m) m = arr[i]!
  }
  return m
}

/**
 * Find minimum in an array.
 */
export function min(arr: number[]): number {
  if (arr.length === 0) return 0
  let m = arr[0]!
  for (let i = 1; i < arr.length; i++) {
    if (arr[i]! < m) m = arr[i]!
  }
  return m
}
