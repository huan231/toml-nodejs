import type { ArrayTableNode, KeyNode, KeyValuePairNode, TableNode } from './ast.js';
import { TOMLError } from './errors.js';

const makeKeyComponents = (keyNode: KeyNode) => {
  return keyNode.keys.map((key) => key.value);
};

const makeKey = (keyNode: KeyNode) => {
  return makeKeyComponents(keyNode).join('.');
};

const makeHeaderFromArrayTable = (arrayTable: string) => {
  return arrayTable
    .split('.')
    .filter((component) => !component.startsWith('['))
    .join('.');
};

export class Keystore {
  private readonly keys = new Set<string>();
  private readonly tables: string[] = [];
  private readonly implicitTables = new Set<string>();
  private readonly arrayTables: string[] = [];

  addNode(node: KeyValuePairNode | TableNode | ArrayTableNode) {
    switch (node.type) {
      case 'KEY_VALUE_PAIR':
        return this.addKeyValuePairNode(node);
      case 'TABLE':
        return this.addTableNode(node);
      case 'ARRAY_TABLE':
        return this.addArrayTableNode(node);
    }
  }

  private addKeyValuePairNode(keyValuePairNode: KeyValuePairNode) {
    const table = this.tables[this.tables.length - 1];

    let key = '';

    if (table) {
      key += `${table}.`;
    }

    const components = makeKeyComponents(keyValuePairNode.key);

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      if (i === 0) {
        key += component;
      } else {
        key += `.${component}`;
      }

      if (this.keys.has(key) || this.tables.includes(key)) {
        throw new TOMLError();
      }

      // As long as a key hasn't been directly defined, you may still write to it and to names within it.
      //
      // https://toml.io/en/v1.0.0#keyvalue-pair
      if (components.length > 1 && i < components.length - 1) {
        this.implicitTables.add(key);
      } else if (this.implicitTables.has(key)) {
        throw new TOMLError();
      }
    }

    this.keys.add(key);
  }

  private addTableNode(tableNode: TableNode) {
    let components = makeKeyComponents(tableNode.key);

    const header = components.join('.');
    const arrayTable = [...this.arrayTables]
      .reverse()
      .find((arrayTable) => header.startsWith(makeHeaderFromArrayTable(arrayTable)));

    let key = '';

    if (typeof arrayTable !== 'undefined') {
      components = header
        .slice(makeHeaderFromArrayTable(arrayTable).length)
        .split('.')
        .filter((component) => component !== '');

      // Attempting to define a normal table with the same name as an already established array must
      // produce an error at parse time.
      //
      // https://toml.io/en/v1.0.0#array-of-tables
      if (!components.length) {
        throw new TOMLError();
      }

      key = `${arrayTable}.`;
    }

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      if (i === 0) {
        key += component;
      } else {
        key += `.${component}`;
      }

      if (this.keys.has(key)) {
        throw new TOMLError();
      }
    }

    if (this.arrayTables.includes(key) || this.tables.includes(key) || this.implicitTables.has(key)) {
      throw new TOMLError();
    }

    this.tables.push(key);
  }

  private addArrayTableNode(arrayTableNode: ArrayTableNode) {
    const header = makeKey(arrayTableNode.key);

    if (this.keys.has(header)) {
      throw new TOMLError();
    }

    // Attempting to redefine a normal table as an array must likewise produce a parse-time error.
    //
    // https://toml.io/en/v1.0.0#array-of-tables
    if (this.tables.includes(header) || this.implicitTables.has(header)) {
      throw new TOMLError();
    }

    let key = header;
    let index = 0;

    for (let i = this.arrayTables.length - 1; i >= 0; i--) {
      const arrayTable = this.arrayTables[i];
      const arrayTableHeader = makeHeaderFromArrayTable(arrayTable);

      if (arrayTableHeader === header) {
        index++;

        continue;
      }

      if (header.startsWith(arrayTableHeader)) {
        key = `${arrayTable}${header.slice(arrayTableHeader.length)}`;

        break;
      }
    }

    // If the parent of a table or array of tables is an array element, that element must
    // already have been defined before the child can be defined.
    // Attempts to reverse that ordering must produce an error at parse time.
    //
    // https://toml.io/en/v1.0.0#array-of-tables
    if (index === 0 && this.tables.some((table) => table.startsWith(header))) {
      throw new TOMLError();
    }

    if (this.keys.has(key) || this.tables.includes(key)) {
      throw new TOMLError();
    }

    key += `.[${index}]`;

    this.arrayTables.push(key);
    this.tables.push(key);
  }
}
