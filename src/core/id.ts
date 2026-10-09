import type { IdGenerator } from './types';

export function createIdGenerator(): IdGenerator {
  let counter = 0;
  return () => `item_${++counter}`;
}
