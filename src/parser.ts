import { Tokenizer } from './tokenizer.js';
import { TOMLError } from './errors.js';
import type {
  ArrayNode,
  ArrayTableNode,
  BooleanNode,
  FloatNode,
  InlineTableNode,
  IntegerNode,
  KeyNode,
  KeyValuePairNode,
  LocalDateNode,
  LocalDateTimeNode,
  LocalTimeNode,
  OffsetDateTimeNode,
  RootTableNode,
  TableNode,
  ValueNode,
} from './ast.js';
import { LocalDate, LocalDateTime, LocalTime } from './types.js';
import { isBinary, isDecimal, isHexadecimal, isOctal } from './utils.js';
import { Keystore } from './keystore.js';

const DIGIT_CHECKS = {
  [10]: isDecimal,
  [16]: isHexadecimal,
  [8]: isOctal,
  [2]: isBinary,
};

const RADIX_PREFIXES = {
  [10]: '',
  [16]: '0x',
  [8]: '0o',
  [2]: '0b',
};

const parseInteger = (
  value: string,
  isSignAllowed: boolean,
  areLeadingZerosAllowed: boolean,
  isUnparsedAllowed: boolean,
  radix: 10 | 16 | 8 | 2,
) => {
  let i = 0;

  if (value[i] === '+' || value[i] === '-') {
    if (!isSignAllowed) {
      throw new TOMLError();
    }

    i++;
  }

  if (!areLeadingZerosAllowed && value[i] === '0' && i + 1 !== value.length) {
    throw new TOMLError();
  }

  // For large numbers, you may use underscores between digits to enhance readability.
  // Each underscore must be surrounded by at least one digit on each side.
  //
  // https://toml.io/en/v1.0.0#integer
  let isUnderscoreAllowed = false;

  for (; i < value.length; i++) {
    const char = value[i];

    if (char === '_') {
      if (!isUnderscoreAllowed) {
        throw new TOMLError();
      }

      isUnderscoreAllowed = false;

      continue;
    }

    if (!DIGIT_CHECKS[radix](char)) {
      break;
    }

    isUnderscoreAllowed = true;
  }

  if (!isUnderscoreAllowed) {
    throw new TOMLError();
  }

  const int = value.slice(0, i).replaceAll('_', '');
  const unparsed = value.slice(i);

  if (!isUnparsedAllowed && unparsed !== '') {
    throw new TOMLError();
  }

  return { int, unparsed };
};

// Arbitrary 64-bit signed integers (from −2^63 to 2^63−1) should be accepted and handled losslessly.
//
// https://toml.io/en/v1.0.0#integer
const MAX_INTEGER = 2n ** (64n - 1n) - 1n;

const parseBigInt = (value: string, radix: 10 | 16 | 8 | 2) => {
  let int: bigint;

  try {
    int = BigInt(`${RADIX_PREFIXES[radix]}${value}`);
  } catch {
    throw new TOMLError();
  }

  // If an integer cannot be represented losslessly, an error must be thrown.
  //
  // https://toml.io/en/v1.0.0#integer
  if (int > MAX_INTEGER) {
    throw new TOMLError();
  }

  return int;
};

const parseDate = (value: string) => {
  try {
    return new Date(value);
  } catch {
    throw new TOMLError();
  }
};

export class Parser {
  private readonly tokenizer: Tokenizer;
  private readonly keystore: Keystore;
  private readonly rootTableNode: RootTableNode;
  private tableNode: RootTableNode | TableNode | ArrayTableNode;

  constructor(input: string) {
    this.tokenizer = new Tokenizer(input);
    this.keystore = new Keystore();
    this.rootTableNode = { type: 'ROOT_TABLE', elements: [] };
    this.tableNode = this.rootTableNode;
  }

  parse() {
    for (;;) {
      const node = this.expression();

      if (!node) {
        break;
      }

      this.tokenizer.take('WHITESPACE');
      this.tokenizer.take('COMMENT');

      this.tokenizer.assert('NEWLINE', 'EOF');

      this.keystore.addNode(node);

      if (node.type === 'ARRAY_TABLE' || node.type === 'TABLE') {
        this.tableNode = node;

        this.rootTableNode.elements.push(node);
      } else {
        this.tableNode.elements.push(node);
      }
    }

    return this.rootTableNode;
  }

  private expression() {
    this.takeCommentsAndNewlines();

    const token = this.tokenizer.peek();

    switch (token.type) {
      case 'LEFT_SQUARE_BRACKET':
        return this.table();
      case 'EOF':
        return null;
      default:
        return this.keyValuePair();
    }
  }

  private table(): ArrayTableNode | TableNode {
    this.tokenizer.next();

    const isArrayTable = this.tokenizer.take('LEFT_SQUARE_BRACKET');
    const key = this.key();

    this.tokenizer.assert('RIGHT_SQUARE_BRACKET');

    if (isArrayTable) {
      this.tokenizer.assert('RIGHT_SQUARE_BRACKET');
    }

    return { type: isArrayTable ? 'ARRAY_TABLE' : 'TABLE', key, elements: [] };
  }

  private key() {
    const keyNode: KeyNode = { type: 'KEY', keys: [] };

    do {
      this.tokenizer.take('WHITESPACE');

      const token = this.tokenizer.next();

      switch (token.type) {
        case 'BARE':
          keyNode.keys.push({ type: 'BARE', value: token.value });

          break;
        case 'STRING':
          if (token.isMultiline) {
            throw new TOMLError();
          }

          keyNode.keys.push({ type: 'STRING', value: token.value });

          break;
        default:
          throw new TOMLError();
      }

      this.tokenizer.take('WHITESPACE');
    } while (this.tokenizer.take('PERIOD'));

    return keyNode;
  }

  private keyValuePair(): KeyValuePairNode {
    const key = this.key();

    this.tokenizer.assert('EQUALS');
    this.tokenizer.take('WHITESPACE');

    const value = this.value();

    return { type: 'KEY_VALUE_PAIR', key, value };
  }

  private value(): ValueNode {
    const token = this.tokenizer.next();

    switch (token.type) {
      case 'STRING':
        return { type: 'STRING', value: token.value };
      case 'BARE':
        return this.booleanOrNumberOrDateOrDateTimeOrTime(token.value);
      case 'PLUS':
        return this.plus();
      case 'LEFT_SQUARE_BRACKET':
        return this.array();
      case 'LEFT_CURLY_BRACKET':
        return this.inlineTable();
      default:
        throw new TOMLError();
    }
  }

  private booleanOrNumberOrDateOrDateTimeOrTime(
    value: string,
  ): BooleanNode | OffsetDateTimeNode | LocalDateTimeNode | LocalDateNode | LocalTimeNode | IntegerNode | FloatNode {
    if (value === 'true' || value === 'false') {
      return { type: 'BOOLEAN', value: value === 'true' };
    }

    if (value.includes('-', 1) && !value.includes('e-') && !value.includes('E-')) {
      return this.dateOrDateTime(value);
    }

    if (this.tokenizer.peek().type === 'COLON') {
      return this.time(value);
    }

    return this.number(value);
  }

  private dateOrDateTime(value: string): OffsetDateTimeNode | LocalDateTimeNode | LocalDateNode {
    const token = this.tokenizer.peek();

    // For the sake of readability, you may replace the T delimiter between date and time
    // with a space character (as permitted by RFC 3339 section 5.6).
    //
    // https://toml.io/en/v1.0.0#offset-date-time
    if (token.type === 'WHITESPACE' && token.value === ' ') {
      this.tokenizer.next();

      const token = this.tokenizer.peek();

      if (token.type !== 'BARE') {
        return { type: 'LOCAL_DATE', value: LocalDate.fromString(value) };
      }

      this.tokenizer.next();

      value += 'T';
      value += token.value;
    }

    if (!value.includes('T') && !value.includes('t')) {
      return { type: 'LOCAL_DATE', value: LocalDate.fromString(value) };
    }

    const tokens = this.tokenizer.sequence('COLON', 'BARE', 'COLON', 'BARE');

    value += tokens.reduce((prevValue, token) => prevValue + token.value, '');

    if (tokens[tokens.length - 1].value.endsWith('Z')) {
      return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
    }

    if (tokens[tokens.length - 1].value.includes('-')) {
      this.tokenizer.assert('COLON');

      const token = this.tokenizer.expect('BARE');

      value += ':';
      value += token.value;

      return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
    }

    switch (this.tokenizer.peek().type) {
      case 'PLUS': {
        this.tokenizer.next();

        const tokens = this.tokenizer.sequence('BARE', 'COLON', 'BARE');

        value += '+';
        value += tokens.reduce((prevValue, token) => prevValue + token.value, '');

        return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
      }
      case 'PERIOD': {
        this.tokenizer.next();

        const token = this.tokenizer.expect('BARE');

        value += '.';
        value += token.value;

        if (token.value.endsWith('Z')) {
          return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
        }

        if (token.value.includes('-')) {
          this.tokenizer.assert('COLON');

          const token = this.tokenizer.expect('BARE');

          value += ':';
          value += token.value;

          return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
        }

        if (this.tokenizer.take('PLUS')) {
          const tokens = this.tokenizer.sequence('BARE', 'COLON', 'BARE');

          value += '+';
          value += tokens.reduce((prevValue, token) => prevValue + token.value, '');

          return { type: 'OFFSET_DATE_TIME', value: parseDate(value) };
        }

        break;
      }
    }

    return { type: 'LOCAL_DATE_TIME', value: LocalDateTime.fromString(value) };
  }

  private time(value: string): LocalTimeNode {
    const tokens = this.tokenizer.sequence('COLON', 'BARE', 'COLON', 'BARE');

    value += tokens.reduce((prevValue, token) => prevValue + token.value, '');

    if (this.tokenizer.take('PERIOD')) {
      const token = this.tokenizer.expect('BARE');

      value += '.';
      value += token.value;
    }

    return { type: 'LOCAL_TIME', value: LocalTime.fromString(value) };
  }

  private plus() {
    const token = this.tokenizer.expect('BARE');

    return this.number(`+${token.value}`);
  }

  private number(value: string): IntegerNode | FloatNode {
    switch (value) {
      case 'inf':
      case '+inf':
        return { type: 'FLOAT', value: Infinity };
      case '-inf':
        return { type: 'FLOAT', value: -Infinity };
      case 'nan':
      case '+nan':
      case '-nan':
        return { type: 'FLOAT', value: NaN };
    }

    if (value.startsWith('0x')) {
      return this.integer(value.slice(2), 16);
    }

    if (value.startsWith('0o')) {
      return this.integer(value.slice(2), 8);
    }

    if (value.startsWith('0b')) {
      return this.integer(value.slice(2), 2);
    }

    if (value.includes('e') || value.includes('E') || this.tokenizer.peek().type === 'PERIOD') {
      return this.float(value);
    }

    return this.integer(value, 10);
  }

  private integer(value: string, radix: 10 | 16 | 8 | 2): IntegerNode {
    const isSignAllowed = radix === 10;
    const areLeadingZerosAllowed = radix !== 10;

    const { int } = parseInteger(value, isSignAllowed, areLeadingZerosAllowed, false, radix);

    return { type: 'INTEGER', value: parseBigInt(int, radix) };
  }

  private float(value: string): FloatNode {
    let { int: float, unparsed } = parseInteger(value, true, false, true, 10);

    if (this.tokenizer.take('PERIOD')) {
      if (unparsed !== '') {
        throw new TOMLError();
      }

      const token = this.tokenizer.expect('BARE');

      const result = parseInteger(token.value, false, true, true, 10);

      float += `.${result.int}`;
      unparsed = result.unparsed;
    }

    if (unparsed.startsWith('e') || unparsed.startsWith('E')) {
      float += 'e';

      if (unparsed.length === 1) {
        this.tokenizer.assert('PLUS');

        const token = this.tokenizer.expect('BARE');

        float += '+';
        float += parseInteger(token.value, false, true, false, 10).int;
      } else {
        float += parseInteger(unparsed.slice(1), true, true, false, 10).int;
      }
    } else if (unparsed !== '') {
      throw new TOMLError();
    }

    return { type: 'FLOAT', value: parseFloat(float) };
  }

  private array() {
    const arrayNode: ArrayNode = { type: 'ARRAY', elements: [] };

    for (;;) {
      this.takeCommentsAndNewlines();

      if (this.tokenizer.peek().type === 'RIGHT_SQUARE_BRACKET') {
        break;
      }

      const value = this.value();

      arrayNode.elements.push(value);

      this.takeCommentsAndNewlines();

      if (!this.tokenizer.take('COMMA')) {
        this.takeCommentsAndNewlines();

        break;
      }
    }

    this.tokenizer.assert('RIGHT_SQUARE_BRACKET');

    return arrayNode;
  }

  private inlineTable() {
    this.tokenizer.take('WHITESPACE');

    const inlineTableNode: InlineTableNode = { type: 'INLINE_TABLE', elements: [] };

    if (this.tokenizer.take('RIGHT_CURLY_BRACKET')) {
      return inlineTableNode;
    }

    const keystore = new Keystore();

    for (;;) {
      const keyValue = this.keyValuePair();

      keystore.addNode(keyValue);

      inlineTableNode.elements.push(keyValue);

      this.tokenizer.take('WHITESPACE');

      if (this.tokenizer.take('RIGHT_CURLY_BRACKET')) {
        break;
      }

      this.tokenizer.assert('COMMA');
    }

    return inlineTableNode;
  }

  private takeCommentsAndNewlines() {
    for (;;) {
      this.tokenizer.take('WHITESPACE');

      if (this.tokenizer.take('COMMENT')) {
        this.tokenizer.assert('NEWLINE');

        continue;
      }

      if (!this.tokenizer.take('NEWLINE')) {
        break;
      }
    }
  }
}
