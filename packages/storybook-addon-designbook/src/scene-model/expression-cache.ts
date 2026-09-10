/**
 * Expression Cache — compiled JSONata expression cache.
 *
 * Caches compiled JSONata expressions keyed by file path.
 * Supports invalidation for HMR.
 */

import jsonata from 'jsonata';

export class ExpressionCache {
  private cache = new Map<string, jsonata.Expression>();

  /**
   * Get or compile a JSONata expression.
   * If already compiled, returns the cached version.
   */
  getOrCompile(path: string, expressionSource: string): jsonata.Expression {
    let compiled = this.cache.get(path);
    if (!compiled) {
      compiled = jsonata(expressionSource);
      this.cache.set(path, compiled);
    }
    return compiled;
  }

  /**
   * Invalidate a cached expression (e.g., on HMR file change).
   */
  invalidate(path: string): boolean {
    return this.cache.delete(path);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached expressions.
   */
  get size(): number {
    return this.cache.size;
  }
}
