import { Parser } from './parser.js';
import { normalize, type Value } from './normalizer.js';

export const decode = <T extends Record<string, Value>>(input: string): T => {
  const parser = new Parser(input);
  const node = parser.parse();

  return normalize(node) as T;
};
