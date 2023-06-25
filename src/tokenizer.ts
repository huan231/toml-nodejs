import { TOMLError } from './errors.js';
import { isHexadecimal } from './utils.js';

interface BaseToken<T extends string> {
  type: T;
  value: string;
}

type WhitespaceToken = BaseToken<'WHITESPACE'>;
type NewlineToken = BaseToken<'NEWLINE'>;
type CommentToken = BaseToken<'COMMENT'>;
type EqualsToken = BaseToken<'EQUALS'>;
type PeriodToken = BaseToken<'PERIOD'>;
type CommaToken = BaseToken<'COMMA'>;
type ColonToken = BaseToken<'COLON'>;
type PLusToken = BaseToken<'PLUS'>;
type LeftSquareBracketToken = BaseToken<'LEFT_SQUARE_BRACKET'>;
type RightSquareBracketToken = BaseToken<'RIGHT_SQUARE_BRACKET'>;
type LeftCurlyBracketToken = BaseToken<'LEFT_CURLY_BRACKET'>;
type RightCurlyBracketToken = BaseToken<'RIGHT_CURLY_BRACKET'>;
type BareToken = BaseToken<'BARE'>;

interface EOFToken {
  type: 'EOF';
}

interface StringToken extends BaseToken<'STRING'> {
  isMultiline: boolean;
}

type Token =
  | WhitespaceToken
  | NewlineToken
  | CommentToken
  | EqualsToken
  | PeriodToken
  | CommaToken
  | ColonToken
  | PLusToken
  | LeftSquareBracketToken
  | RightSquareBracketToken
  | LeftCurlyBracketToken
  | RightCurlyBracketToken
  | BareToken
  | EOFToken
  | StringToken;

type TokenFromType<T extends Token['type']> = Extract<Token, { type: T }>;

const EOF = -1;

const isBare = (char: string | typeof EOF) => {
  return (
    ('A' <= char && char <= 'Z') ||
    ('a' <= char && char <= 'z') ||
    ('0' <= char && char <= '9') ||
    char === '-' ||
    char === '_'
  );
};

// Whitespace means tab (0x09) or space (0x20).
//
// https://toml.io/en/v1.0.0#spec
const isWhitespace = (char: string | typeof EOF) => {
  return char === ' ' || char === '\t';
};

const isUnicodeCharacter = (char: string | typeof EOF) => {
  return char <= '\u{10ffff}';
};

const isControlCharacter = (char: string | typeof EOF) => {
  return ('\u{0}' <= char && char < '\u{20}') || char === '\u{7f}';
};

const isControlCharacterOtherThanTab = (char: string | typeof EOF) => {
  return isControlCharacter(char) && char !== '\t';
};

const PUNCTUATOR_OR_NEWLINE_TOKENS = {
  '\n': 'NEWLINE',
  '=': 'EQUALS',
  '.': 'PERIOD',
  ',': 'COMMA',
  ':': 'COLON',
  '+': 'PLUS',
  '{': 'LEFT_CURLY_BRACKET',
  '}': 'RIGHT_CURLY_BRACKET',
  '[': 'LEFT_SQUARE_BRACKET',
  ']': 'RIGHT_SQUARE_BRACKET',
} as const;

const isPunctuatorOrNewline = (char: string | typeof EOF): char is keyof typeof PUNCTUATOR_OR_NEWLINE_TOKENS => {
  return char in PUNCTUATOR_OR_NEWLINE_TOKENS;
};

// For convenience, some popular characters have a compact escape sequence.
//
// \b         - backspace       (U+0008)
// \t         - tab             (U+0009)
// \n         - linefeed        (U+000A)
// \f         - form feed       (U+000C)
// \r         - carriage return (U+000D)
// \"         - quote           (U+0022)
// \\         - backslash       (U+005C)
//
// https://toml.io/en/v1.0.0#string
const ESCAPES = {
  'b': '\b',
  't': '\t',
  'n': '\n',
  'f': '\f',
  'r': '\r',
  '"': '"',
  '\\': '\\',
};

const isEscaped = (char: string | typeof EOF): char is keyof typeof ESCAPES => {
  return char in ESCAPES;
};

class InputIterator {
  pos = -1;

  constructor(private readonly input: string) {}

  peek() {
    const pos = this.pos;
    const char = this.next();

    this.pos = pos;

    return char;
  }

  take(...chars: string[]) {
    const char = this.peek();

    if (char !== EOF && chars.includes(char)) {
      this.next();

      return true;
    }

    return false;
  }

  next() {
    if (this.pos + 1 === this.input.length) {
      return EOF;
    }

    this.pos++;

    const char = this.input[this.pos];

    if (char === '\r' && this.input[this.pos + 1] === '\n') {
      this.pos++;

      return '\n';
    }

    return char;
  }
}

export class Tokenizer {
  private readonly iterator: InputIterator;

  constructor(private readonly input: string) {
    this.iterator = new InputIterator(input);
  }

  peek() {
    const pos = this.iterator.pos;

    try {
      const token = this.next();

      this.iterator.pos = pos;

      return token;
    } catch (err) {
      this.iterator.pos = pos;

      throw err;
    }
  }

  take(...types: Token['type'][]) {
    const token = this.peek();

    if (types.includes(token.type)) {
      this.next();

      return true;
    }

    return false;
  }

  assert(...types: Token['type'][]) {
    if (!this.take(...types)) {
      throw new TOMLError();
    }
  }

  expect<T extends Token['type']>(type: T): TokenFromType<T> {
    const token = this.next();

    if (token.type !== type) {
      throw new TOMLError();
    }

    return token as TokenFromType<T>;
  }

  sequence<T1 extends Token['type'], T2 extends Token['type'], T3 extends Token['type']>(
    type1: T1,
    type2: T2,
    type3: T3,
  ): [TokenFromType<T1>, TokenFromType<T2>, TokenFromType<T3>];
  sequence<T1 extends Token['type'], T2 extends Token['type'], T3 extends Token['type'], T4 extends Token['type']>(
    type1: T1,
    type2: T2,
    type3: T3,
    type4: T4,
  ): [TokenFromType<T1>, TokenFromType<T2>, TokenFromType<T3>, TokenFromType<T4>];
  sequence(...types: Token['type'][]): Token[] {
    return types.map((type) => this.expect(type));
  }

  next(): Token {
    const char = this.iterator.next();
    const start = this.iterator.pos;

    if (isPunctuatorOrNewline(char)) {
      return { type: PUNCTUATOR_OR_NEWLINE_TOKENS[char], value: char };
    }

    if (isBare(char)) {
      return this.scanBare(start);
    }

    switch (char) {
      case ' ':
      case '\t':
        return this.scanWhitespace(start);
      case '#':
        return this.scanComment(start);
      case "'":
        return this.scanLiteralString();
      case '"':
        return this.scanBasicString();
      case EOF:
        return { type: 'EOF' };
    }

    throw new TOMLError();
  }

  private scanBare(start: number): BareToken {
    while (isBare(this.iterator.peek())) {
      this.iterator.next();
    }

    return { type: 'BARE', value: this.input.slice(start, this.iterator.pos + 1) };
  }

  private scanWhitespace(start: number): WhitespaceToken {
    while (isWhitespace(this.iterator.peek())) {
      this.iterator.next();
    }

    return { type: 'WHITESPACE', value: this.input.slice(start, this.iterator.pos + 1) };
  }

  private scanComment(start: number): CommentToken {
    for (;;) {
      const char = this.iterator.peek();

      // Control characters other than tab (U+0000 to U+0008, U+000A to U+001F, U+007F) are not permitted in comments.
      //
      // https://toml.io/en/v1.0.0#comment
      if (!isControlCharacterOtherThanTab(char)) {
        this.iterator.next();

        continue;
      }

      return { type: 'COMMENT', value: this.input.slice(start, this.iterator.pos + 1) };
    }
  }

  private scanString(delimiter: "'" | '"'): StringToken {
    let isMultiline = false;

    if (this.iterator.take(delimiter)) {
      if (!this.iterator.take(delimiter)) {
        return { type: 'STRING', value: '', isMultiline: false };
      }

      isMultiline = true;
    }

    // A newline immediately following the opening delimiter will be trimmed.
    //
    // https://toml.io/en/v1.0.0#string
    if (isMultiline) {
      this.iterator.take('\n');
    }

    let value = '';

    for (;;) {
      const char = this.iterator.next();

      switch (char) {
        case '\n':
          if (!isMultiline) {
            throw new TOMLError();
          }

          value += char;

          continue;
        case delimiter:
          if (isMultiline) {
            if (!this.iterator.take(delimiter)) {
              value += delimiter;

              continue;
            }

            if (!this.iterator.take(delimiter)) {
              value += delimiter;
              value += delimiter;

              continue;
            }

            if (this.iterator.take(delimiter)) {
              value += delimiter;
            }

            if (this.iterator.take(delimiter)) {
              value += delimiter;
            }
          }

          break;
        case undefined:
          throw new TOMLError();
        default:
          if (isControlCharacterOtherThanTab(char)) {
            throw new TOMLError();
          }

          switch (delimiter) {
            case "'":
              value += char;

              continue;
            case '"':
              if (char === '\\') {
                const char = this.iterator.next();

                if (isEscaped(char)) {
                  value += ESCAPES[char];

                  continue;
                }

                // Any Unicode character may be escaped with the \uXXXX or \UXXXXXXXX forms.
                // The escape codes must be valid Unicode scalar values.
                //
                // https://toml.io/en/v1.0.0#string
                if (char === 'u' || char === 'U') {
                  const size = char === 'u' ? 4 : 8;

                  let codePoint = '';

                  for (let i = 0; i < size; i++) {
                    const char = this.iterator.next();

                    if (char === EOF || !isHexadecimal(char)) {
                      throw new TOMLError();
                    }

                    codePoint += char;
                  }

                  const result = String.fromCodePoint(parseInt(codePoint, 16));

                  if (!isUnicodeCharacter(result)) {
                    throw new TOMLError();
                  }

                  value += result;

                  continue;
                }

                // For writing long strings without introducing extraneous whitespace, use a "line ending backslash".
                // When the last non-whitespace character on a line is an unescaped \, it will be trimmed along with all
                // whitespace (including newlines) up to the next non-whitespace character or closing delimiter.
                //
                // https://toml.io/en/v1.0.0#string
                if (isMultiline && (isWhitespace(char) || char === '\n')) {
                  while (this.iterator.take(' ', '\t', '\n')) {
                    //
                  }

                  continue;
                }

                throw new TOMLError();
              }

              value += char;

              continue;
          }
      }

      break;
    }

    return { type: 'STRING', value, isMultiline };
  }

  private scanLiteralString() {
    return this.scanString("'");
  }

  private scanBasicString() {
    return this.scanString('"');
  }
}
