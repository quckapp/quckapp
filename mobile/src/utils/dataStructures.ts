/**
 * Data Structures for Mobile App
 * Design Principle: Encapsulation, Single Responsibility
 * SOLID: Each class has single responsibility
 */

/**
 * Priority Queue - Min heap implementation
 * Data Structure: Binary Heap
 * Time Complexity: O(log n) for enqueue/dequeue
 * Use Case: Message priority, notification ordering
 */
export class PriorityQueue<T> {
  private heap: Array<{ value: T; priority: number }> = [];

  /**
   * Enqueue element with priority
   * Time Complexity: O(log n)
   * @param value - Value to enqueue
   * @param priority - Priority (lower number = higher priority)
   */
  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Dequeue highest priority element
   * Time Complexity: O(log n)
   * @returns Highest priority element or null
   */
  dequeue(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    if (this.heap.length === 1) {
      return this.heap.pop()!.value;
    }

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);

    return min.value;
  }

  /**
   * Peek at highest priority element
   * Time Complexity: O(1)
   * @returns Highest priority element or null
   */
  peek(): T | null {
    return this.isEmpty() ? null : this.heap[0].value;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    if (index === 0) return;

    const parentIndex = Math.floor((index - 1) / 2);

    if (this.heap[index].priority < this.heap[parentIndex].priority) {
      [this.heap[index], this.heap[parentIndex]] =
        [this.heap[parentIndex], this.heap[index]];
      this.bubbleUp(parentIndex);
    }
  }

  private bubbleDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let smallest = index;

    if (
      leftChild < this.heap.length &&
      this.heap[leftChild].priority < this.heap[smallest].priority
    ) {
      smallest = leftChild;
    }

    if (
      rightChild < this.heap.length &&
      this.heap[rightChild].priority < this.heap[smallest].priority
    ) {
      smallest = rightChild;
    }

    if (smallest !== index) {
      [this.heap[index], this.heap[smallest]] =
        [this.heap[smallest], this.heap[index]];
      this.bubbleDown(smallest);
    }
  }
}

/**
 * Trie - Prefix tree for fast string search
 * Data Structure: Trie (Prefix Tree)
 * Time Complexity: O(m) for search where m is string length
 * Use Case: Contact search, autocomplete
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  data: any = null;
}

export class Trie {
  private root: TrieNode = new TrieNode();

  /**
   * Insert word into trie
   * Time Complexity: O(m)
   * @param word - Word to insert
   * @param data - Associated data
   */
  insert(word: string, data?: any): void {
    let node = this.root;

    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.data = data;
  }

  /**
   * Search for word
   * Time Complexity: O(m)
   * @param word - Word to search
   * @returns True if word exists
   */
  search(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEndOfWord;
  }

  /**
   * Find all words with prefix
   * Time Complexity: O(m + n) where n is number of results
   * @param prefix - Prefix to search
   * @returns Array of words with prefix
   */
  searchByPrefix(prefix: string): any[] {
    const node = this.findNode(prefix);
    if (!node) return [];

    const results: any[] = [];
    this.collectWords(node, results);
    return results;
  }

  private findNode(word: string): TrieNode | null {
    let node = this.root;

    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }

    return node;
  }

  private collectWords(node: TrieNode, results: any[]): void {
    if (node.isEndOfWord && node.data) {
      results.push(node.data);
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results);
    }
  }
}

/**
 * Circular Buffer - Fixed-size buffer with automatic overwriting
 * Data Structure: Circular Buffer (Ring Buffer)
 * Time Complexity: O(1) for add/get
 * Use Case: Message history, scroll buffer
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add element to buffer
   * Time Complexity: O(1)
   * @param item - Item to add
   */
  add(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get element at index
   * Time Complexity: O(1)
   * @param index - Index to get
   * @returns Element at index
   */
  get(index: number): T | undefined {
    if (index >= this.count) {
      return undefined;
    }

    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get all elements as array
   * Time Complexity: O(n)
   * @returns Array of all elements
   */
  toArray(): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      result.push(this.buffer[index]);
    }

    return result;
  }

  get size(): number {
    return this.count;
  }

  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }
}

/**
 * Bloom Filter - Probabilistic data structure for membership testing
 * Data Structure: Bloom Filter with bit array
 * Time Complexity: O(k) where k is number of hash functions
 * Space Complexity: Extremely efficient
 * Use Case: Check if message was seen, cache checking
 */
export class BloomFilter {
  private bitArray: boolean[];
  private size: number;
  private hashFunctions: number;

  constructor(size: number = 1000, hashFunctions: number = 3) {
    this.size = size;
    this.hashFunctions = hashFunctions;
    this.bitArray = new Array(size).fill(false);
  }

  /**
   * Add element to bloom filter
   * Time Complexity: O(k)
   * @param item - Item to add
   */
  add(item: string): void {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.hash(item, i);
      this.bitArray[hash] = true;
    }
  }

  /**
   * Check if element might be in set
   * Time Complexity: O(k)
   * @param item - Item to check
   * @returns True if might exist, false if definitely doesn't exist
   */
  mightContain(item: string): boolean {
    for (let i = 0; i < this.hashFunctions; i++) {
      const hash = this.hash(item, i);
      if (!this.bitArray[hash]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Hash function
   * Algorithm: Simple hash with seed
   * @param item - Item to hash
   * @param seed - Hash seed
   * @returns Hash value
   */
  private hash(item: string, seed: number): number {
    let hash = seed;

    for (let i = 0; i < item.length; i++) {
      hash = (hash << 5) - hash + item.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash) % this.size;
  }

  clear(): void {
    this.bitArray.fill(false);
  }
}

/**
 * Doubly Linked List - For efficient insertion/deletion
 * Data Structure: Doubly Linked List
 * Time Complexity: O(1) for add/remove at ends, O(n) for search
 * Use Case: Message list, undo/redo operations
 */
class ListNode<T> {
  constructor(
    public value: T,
    public prev: ListNode<T> | null = null,
    public next: ListNode<T> | null = null,
  ) {}
}

export class DoublyLinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private count: number = 0;

  /**
   * Add element to end
   * Time Complexity: O(1)
   * @param value - Value to add
   */
  append(value: T): void {
    const node = new ListNode(value);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail!.next = node;
      node.prev = this.tail;
      this.tail = node;
    }

    this.count++;
  }

  /**
   * Add element to beginning
   * Time Complexity: O(1)
   * @param value - Value to add
   */
  prepend(value: T): void {
    const node = new ListNode(value);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    this.count++;
  }

  /**
   * Remove element from end
   * Time Complexity: O(1)
   * @returns Removed value or null
   */
  pop(): T | null {
    if (!this.tail) {
      return null;
    }

    const value = this.tail.value;

    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;
    } else {
      this.tail = this.tail.prev;
      this.tail!.next = null;
    }

    this.count--;
    return value;
  }

  /**
   * Convert to array
   * Time Complexity: O(n)
   * @returns Array of values
   */
  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;

    while (current) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  get size(): number {
    return this.count;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }
}
