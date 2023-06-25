import { LocalDate, LocalDateTime, LocalTime } from './types.js';

export interface RootTableNode {
  type: 'ROOT_TABLE';
  elements: (KeyValuePairNode | TableNode | ArrayTableNode)[];
}

export interface KeyNode {
  type: 'KEY';
  keys: (BareNode | StringNode)[];
}

export type ValueNode =
  | StringNode
  | IntegerNode
  | FloatNode
  | BooleanNode
  | OffsetDateTimeNode
  | LocalDateTimeNode
  | LocalDateNode
  | LocalTimeNode
  | ArrayNode
  | InlineTableNode;

export interface KeyValuePairNode {
  type: 'KEY_VALUE_PAIR';
  key: KeyNode;
  value: ValueNode;
}

export interface TableNode {
  type: 'TABLE';
  key: KeyNode;
  elements: KeyValuePairNode[];
}

export interface ArrayTableNode {
  type: 'ARRAY_TABLE';
  key: KeyNode;
  elements: KeyValuePairNode[];
}

export interface InlineTableNode {
  type: 'INLINE_TABLE';
  elements: KeyValuePairNode[];
}

export interface ArrayNode {
  type: 'ARRAY';
  elements: ValueNode[];
}

export interface BareNode {
  type: 'BARE';
  value: string;
}

export interface StringNode {
  type: 'STRING';
  value: string;
}

export interface IntegerNode {
  type: 'INTEGER';
  value: bigint;
}

export interface FloatNode {
  type: 'FLOAT';
  value: number;
}

export interface BooleanNode {
  type: 'BOOLEAN';
  value: boolean;
}

export interface OffsetDateTimeNode {
  type: 'OFFSET_DATE_TIME';
  value: Date;
}

export interface LocalDateTimeNode {
  type: 'LOCAL_DATE_TIME';
  value: LocalDateTime;
}

export interface LocalDateNode {
  type: 'LOCAL_DATE';
  value: LocalDate;
}

export interface LocalTimeNode {
  type: 'LOCAL_TIME';
  value: LocalTime;
}

export type Node =
  | RootTableNode
  | KeyNode
  | KeyValuePairNode
  | TableNode
  | ArrayTableNode
  | InlineTableNode
  | ArrayNode
  | BareNode
  | StringNode
  | IntegerNode
  | FloatNode
  | BooleanNode
  | OffsetDateTimeNode
  | LocalDateTimeNode
  | LocalDateNode
  | LocalTimeNode;
