import { Global, Module } from '@nestjs/common';
import { TrieService } from './trie.service';

/**
 * SearchModule - Global module for search services
 * Design Pattern: Singleton (Global module)
 * SOLID: Single Responsibility - Only provides search functionality
 */
@Global()
@Module({
  providers: [TrieService],
  exports: [TrieService],
})
export class SearchModule {}
