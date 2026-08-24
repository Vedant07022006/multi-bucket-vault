/**
 * Generic Min-Heap (Priority Queue)
 *
 * A binary min-heap where extractMin() always returns the smallest element.
 * Used by rebalance.service.js to prioritize which files to migrate:
 *  - Keyed by file size (largest files freed from full bucket first), OR
 *  - Keyed by last-access time (least recently accessed first).
 *
 * This is a pure data structure — no DB, no network, no side effects.
 */
class MinHeap {
  /**
   * @param {(a: any, b: any) => number} comparator
   *   Returns negative if a should be extracted before b.
   *   Default: numeric ascending (classic min-heap).
   */
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.comparator = comparator;
  }

  get size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  /** Insert an item and restore the heap property. */
  insert(item) {
    this.heap.push(item);
    this.#bubbleUp(this.heap.length - 1);
  }

  /** Return (without removing) the minimum item. */
  peek() {
    return this.heap[0] ?? null;
  }

  /** Remove and return the minimum item. */
  extractMin() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.#sinkDown(0);
    }
    return min;
  }

  /** Extract all items in ascending order (destructive). */
  extractAll() {
    const result = [];
    while (!this.isEmpty()) result.push(this.extractMin());
    return result;
  }

  #parent(i) { return Math.floor((i - 1) / 2); }
  #left(i)   { return 2 * i + 1; }
  #right(i)  { return 2 * i + 2; }

  #bubbleUp(i) {
    while (i > 0) {
      const p = this.#parent(i);
      if (this.comparator(this.heap[i], this.heap[p]) < 0) {
        [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
        i = p;
      } else {
        break;
      }
    }
  }

  #sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = this.#left(i);
      const r = this.#right(i);

      if (l < n && this.comparator(this.heap[l], this.heap[smallest]) < 0) smallest = l;
      if (r < n && this.comparator(this.heap[r], this.heap[smallest]) < 0) smallest = r;

      if (smallest !== i) {
        [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
        i = smallest;
      } else {
        break;
      }
    }
  }
}

export default MinHeap;
