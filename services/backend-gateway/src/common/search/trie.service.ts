import { Injectable } from '@nestjs/common';

/**
 * TrieService - Implements Trie data structure for fast prefix search
 * Data Structure: Trie (Prefix Tree)
 * Algorithm: O(m) search where m is length of search string
 * Use Case: User search autocomplete with O(m) complexity vs O(n*m) for linear search
 * Design Principle: Single Responsibility - Only handles trie operations
 */

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  data: any = null; // Store user data at end nodes
  frequency: number = 0; // For ranking results
}

@Injectable()
export class TrieService {
  private root: TrieNode = new TrieNode();

  /**
   * Insert word into trie
   * Time Complexity: O(m) where m is length of word
   * Space Complexity: O(m)
   * @param word - Word to insert (e.g., username, displayName)
   * @param data - Associated data (e.g., user object)
   */
  insert(word: string, data: any): void {
    if (!word) {
      return;
    }

    const normalizedWord = word.toLowerCase();
    let node = this.root;

    // Traverse/create nodes for each character
    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
      node.frequency++; // Increment frequency for ranking
    }

    node.isEndOfWord = true;
    node.data = data;
  }

  /**
   * Search for exact word
   * Time Complexity: O(m) where m is length of word
   * @param word - Word to search
   * @returns Associated data or null
   */
  search(word: string): any | null {
    const node = this.findNode(word);
    return node && node.isEndOfWord ? node.data : null;
  }

  /**
   * Check if word exists
   * Time Complexity: O(m)
   * @param word - Word to check
   * @returns True if word exists
   */
  contains(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEndOfWord;
  }

  /**
   * Search with prefix - Returns all words with given prefix
   * Time Complexity: O(m + n) where m is prefix length, n is number of results
   * Algorithm: DFS traversal from prefix node
   * @param prefix - Prefix to search
   * @param limit - Maximum results to return (default: 10)
   * @returns Array of matching data sorted by frequency
   */
  searchByPrefix(prefix: string, limit: number = 10): any[] {
    if (!prefix) {
      return [];
    }

    const normalizedPrefix = prefix.toLowerCase();
    const node = this.findNode(normalizedPrefix);

    if (!node) {
      return [];
    }

    // Collect all words with this prefix using DFS
    const results: Array<{ data: any; frequency: number }> = [];
    this.collectWords(node, results);

    // Sort by frequency (most popular first) and limit results
    return results
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map((item) => item.data);
  }

  /**
   * Fuzzy search - Returns words similar to query
   * Time Complexity: O(m * k) where k is edit distance
   * Algorithm: Levenshtein distance with threshold
   * @param query - Search query
   * @param maxDistance - Maximum edit distance (default: 2)
   * @param limit - Maximum results (default: 10)
   * @returns Array of similar words
   */
  fuzzySearch(query: string, maxDistance: number = 2, limit: number = 10): any[] {
    if (!query) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    const results: Array<{ data: any; distance: number; frequency: number }> = [];

    // Traverse entire trie and calculate Levenshtein distance
    this.fuzzySearchHelper(this.root, '', normalizedQuery, maxDistance, results);

    // Sort by distance (closest first), then by frequency
    return results
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        return b.frequency - a.frequency;
      })
      .slice(0, limit)
      .map((item) => item.data);
  }

  /**
   * Delete word from trie
   * Time Complexity: O(m)
   * @param word - Word to delete
   * @returns True if deleted
   */
  delete(word: string): boolean {
    if (!word) {
      return false;
    }

    const normalizedWord = word.toLowerCase();
    return this.deleteHelper(this.root, normalizedWord, 0);
  }

  /**
   * Clear entire trie
   * Time Complexity: O(1)
   */
  clear(): void {
    this.root = new TrieNode();
  }

  /**
   * Get trie statistics
   * @returns Trie stats
   */
  getStats(): { totalNodes: number; totalWords: number } {
    let totalNodes = 0;
    let totalWords = 0;

    const countNodes = (node: TrieNode) => {
      totalNodes++;
      if (node.isEndOfWord) {
        totalWords++;
      }
      for (const child of node.children.values()) {
        countNodes(child);
      }
    };

    countNodes(this.root);

    return { totalNodes, totalWords };
  }

  /**
   * Find node for given word
   * Time Complexity: O(m)
   * @param word - Word to find
   * @returns TrieNode or null
   */
  private findNode(word: string): TrieNode | null {
    const normalizedWord = word.toLowerCase();
    let node = this.root;

    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }

    return node;
  }

  /**
   * Collect all words from node using DFS
   * Time Complexity: O(n) where n is number of nodes in subtree
   * Algorithm: Depth-First Search
   * @param node - Starting node
   * @param results - Array to collect results
   */
  private collectWords(node: TrieNode, results: Array<{ data: any; frequency: number }>): void {
    if (node.isEndOfWord && node.data) {
      results.push({ data: node.data, frequency: node.frequency });
    }

    // DFS traversal
    for (const child of node.children.values()) {
      this.collectWords(child, results);
    }
  }

  /**
   * Helper for fuzzy search using Levenshtein distance
   * Algorithm: Dynamic programming for edit distance
   * @param node - Current node
   * @param currentWord - Current word being built
   * @param query - Search query
   * @param maxDistance - Maximum allowed distance
   * @param results - Array to collect results
   */
  private fuzzySearchHelper(
    node: TrieNode,
    currentWord: string,
    query: string,
    maxDistance: number,
    results: Array<{ data: any; distance: number; frequency: number }>,
  ): void {
    if (node.isEndOfWord && node.data) {
      const distance = this.levenshteinDistance(currentWord, query);
      if (distance <= maxDistance) {
        results.push({ data: node.data, distance, frequency: node.frequency });
      }
    }

    // Early pruning: if minimum possible distance exceeds max, skip subtree
    const minPossibleDistance = Math.abs(currentWord.length - query.length);
    if (minPossibleDistance > maxDistance) {
      return;
    }

    // Traverse children
    for (const [char, child] of node.children.entries()) {
      this.fuzzySearchHelper(child, currentWord + char, query, maxDistance, results);
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Time Complexity: O(m * n) where m, n are string lengths
   * Algorithm: Dynamic Programming
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create DP table
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] =
            1 +
            Math.min(
              dp[i - 1][j], // Deletion
              dp[i][j - 1], // Insertion
              dp[i - 1][j - 1], // Substitution
            );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Helper for delete operation
   * Time Complexity: O(m)
   * @param node - Current node
   * @param word - Word to delete
   * @param index - Current index in word
   * @returns True if node should be deleted
   */
  private deleteHelper(node: TrieNode, word: string, index: number): boolean {
    if (index === word.length) {
      if (!node.isEndOfWord) {
        return false;
      }
      node.isEndOfWord = false;
      node.data = null;
      return node.children.size === 0;
    }

    const char = word[index];
    const childNode = node.children.get(char);

    if (!childNode) {
      return false;
    }

    const shouldDeleteChild = this.deleteHelper(childNode, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return node.children.size === 0 && !node.isEndOfWord;
    }

    return false;
  }
}
