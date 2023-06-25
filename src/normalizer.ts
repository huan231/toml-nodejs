import type {
  ArrayNode,
  ArrayTableNode,
  BareNode,
  BooleanNode,
  FloatNode,
  InlineTableNode,
  IntegerNode,
  KeyNode,
  KeyValuePairNode,
  LocalDateNode,
  LocalDateTimeNode,
  LocalTimeNode,
  Node,
  OffsetDateTimeNode,
  RootTableNode,
  StringNode,
  TableNode,
} from './ast.js';
import { LocalDate, LocalDateTime, LocalTime } from './types.js';
import { TOMLError } from './errors.js';

export type Value =
  | string
  | bigint
  | number
  | boolean
  | Date
  | LocalDateTime
  | LocalDate
  | LocalTime
  | Value[]
  | { [K: string]: Value };

type NormalizedNode<T extends Node> = T extends KeyNode
  ? string[]
  : T extends RootTableNode | KeyValuePairNode | TableNode | ArrayTableNode | InlineTableNode
  ? Record<string, Value>
  : T extends ArrayNode
  ? Value[]
  : T extends
      | BareNode
      | StringNode
      | IntegerNode
      | FloatNode
      | BooleanNode
      | OffsetDateTimeNode
      | LocalDateTimeNode
      | LocalDateNode
      | LocalTimeNode
  ? T['value']
  : never;

const isKeyValuePair = (value: unknown): value is Record<string, Value> => {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  if (value instanceof LocalDateTime || value instanceof LocalDate || value instanceof LocalTime) {
    return false;
  }

  return true;
};

const merge = (...values: Record<string, Value>[]) => {
  return values.reduce((acc, value) => {
    for (const [key, nextValue] of Object.entries(value)) {
      const prevValue = acc[key];

      if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
        acc[key] = prevValue.concat(nextValue);
      } else if (isKeyValuePair(prevValue) && isKeyValuePair(nextValue)) {
        acc[key] = merge(prevValue, nextValue);
      } else if (
        Array.isArray(prevValue) &&
        isKeyValuePair(prevValue[prevValue.length - 1]) &&
        isKeyValuePair(nextValue)
      ) {
        const prevValueLastElement = prevValue[prevValue.length - 1] as Record<string, Value>;

        acc[key] = [...prevValue.slice(0, -1), merge(prevValueLastElement, nextValue)];
      } else if (typeof prevValue !== 'undefined') {
        throw new TOMLError();
      } else {
        acc[key] = nextValue;
      }
    }

    return acc;
  }, {});
};

const objectify = (key: string[], value: Value) => {
  const initialValue: Record<string, Value> = {};

  const object = key.slice(0, -1).reduce((acc, prop) => {
    acc[prop] = {};

    return acc[prop] as Record<string, Value>;
  }, initialValue);

  object[key[key.length - 1]] = value;

  return initialValue;
};

export const normalize = <T extends Node>(node: T): NormalizedNode<T> => {
  switch (node.type) {
    case 'ROOT_TABLE': {
      const elements = node.elements.map((element) => normalize(element));

      return merge(...elements) as NormalizedNode<T>;
    }
    case 'KEY':
      return node.keys.map((key) => normalize(key)) as NormalizedNode<T>;
    case 'KEY_VALUE_PAIR': {
      const key = normalize(node.key);
      const value = normalize(node.value);

      return objectify(key, value) as NormalizedNode<T>;
    }
    case 'TABLE': {
      const key = normalize(node.key);
      const elements = node.elements.map((element) => normalize(element));

      return objectify(key, merge(...elements)) as NormalizedNode<T>;
    }
    case 'ARRAY_TABLE': {
      const key = normalize(node.key);
      const elements = node.elements.map((element) => normalize(element));

      return objectify(key, [merge(...elements)]) as NormalizedNode<T>;
    }
    case 'INLINE_TABLE': {
      const elements = node.elements.map((element) => normalize(element));

      return merge(...elements) as NormalizedNode<T>;
    }
    case 'ARRAY':
      return node.elements.map((element) => normalize(element)) as NormalizedNode<T>;
    case 'BARE':
    case 'STRING':
    case 'INTEGER':
    case 'FLOAT':
    case 'BOOLEAN':
    case 'OFFSET_DATE_TIME':
    case 'LOCAL_DATE_TIME':
    case 'LOCAL_DATE':
    case 'LOCAL_TIME':
      return node.value as NormalizedNode<T>;
  }
};
