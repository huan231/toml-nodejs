import { Parser } from './parser';
import { normalize, Value } from './normalizer';

export const deserialize = <T extends Record<string, Value>>(input: string): T => {
  const parser = new Parser(input);
  const node = parser.parse();

  return normalize(node) as T;
};
