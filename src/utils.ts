export const isDecimal = (char: string) => {
  return '0' <= char && char <= '9';
};

export const isHexadecimal = (char: string) => {
  return ('A' <= char && char <= 'Z') || ('a' <= char && char <= 'z') || ('0' <= char && char <= '9');
};

export const isOctal = (char: string) => {
  return '0' <= char && char <= '7';
};

export const isBinary = (char: string) => {
  return char === '0' || char === '1';
};
