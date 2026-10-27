// src/lib/performance.ts
/**
 * Simple performance measurement utilities.
 * Usage:
 *   const result = await measure('loginUser', () => loginUser(creds));
 */
export async function measure<T>(label: string, fn: () => Promise<T>, thresholdMs = 2000): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    return result;
  } finally {
    const duration = performance.now() - start;
    console.log(`[perf] ${label} took ${duration.toFixed(2)}ms`);
    if (duration > thresholdMs) {
      console.warn(`[perf] ${label} exceeded threshold of ${thresholdMs}ms`);
      // In a real app you could send to telemetry endpoint here.
    }
  }
}

/**
 * Wrap an async function to automatically measure its execution time.
 * Returns a new function with the same signature.
 */
export function withPerformance<T extends (...args: any[]) => Promise<any>>(
  label: string,
  fn: T,
  thresholdMs = 2000
): (...funcArgs: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return measure(label, () => fn(...args), thresholdMs);
  };
}
