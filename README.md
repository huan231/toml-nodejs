# toml-nodejs

![NPM](https://img.shields.io/npm/l/toml-nodejs)
![npm](https://img.shields.io/npm/v/toml-nodejs)

_A [TOML](https://toml.io/) decoding library for Node.js_

## Introduction

[TOML](https://toml.io/) decoder for Node.js. This library is currently compliant with the [v1.0.0](https://toml.io/en/v1.0.0)
version of TOML.

What is TOML?

> TOML is a file format for configuration files. It is intended to be easy to read and write due to obvious semantics
> which aim to be "minimal", and is designed to map unambiguously to a dictionary.

## Installation

toml-nodejs is available as a [npm package](https://www.npmjs.com/package/toml-nodejs).

```sh
npm install toml-nodejs
```

## Getting started

Here is an example usage of `toml-nodejs` decoder

```ts
import { decode } from 'toml-nodejs';

const input = `
# This is a TOML document

title = "TOML Example"

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00-08:00

[database]
enabled = true
ports = [ 8000, 8001, 8002 ]
data = [ ["delta", "phi"], [3.14] ]
temp_targets = { cpu = 79.5, case = 72.0 }

[servers]

[servers.alpha]
ip = "10.0.0.1"
role = "frontend"

[servers.beta]
ip = "10.0.0.2"
role = "backend"
`;

interface Output {
  title: string;
  owner: {
    name: string;
    dob: Date;
  };
  database: {
    enabled: boolean;
    ports: bigint[];
    data: (string | number)[][];
    temp_targets: {
      cpu: number;
      case: number;
    };
  };
  servers: {
    alpha: {
      ip: string;
      role: string;
    };
    beta: {
      ip: string;
      role: string;
    };
  };
}

const output = decode<Output>(input);
console.log(output);
// {
//   title: 'TOML Example',
//   owner: { name: 'Tom Preston-Werner', dob: Date /* 1979-05-27T07:32:00-08:00 */ },
//   database: {
//     enabled: true,
//     ports: [8001n, 8001n, 8002n],
//     data: [['delta', 'phi'], [3.14]],
//     temp_targets: { cpu: 79.5, case: 72 },
//   },
//   servers: {
//     alpha: { ip: '10.0.0.1', role: 'frontend' },
//     beta: { ip: '10.0.0.2', role: 'backend' },
//   },
// }
```

## TOML data types to JavaScript types

When retrieving the value of a key from a key/value pair, the value is typed according to the following table.

| TOML data type   | JavaScript type                                                                                  |
|------------------|--------------------------------------------------------------------------------------------------|
| string           | [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type)    |
| integer          | [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#bigint_type)    |
| float            | [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type)    |
| boolean          | [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type)  |
| offset date-time | [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)    |
| local date-time  | [LocalDateTime](https://github.com/huan231/toml-nodejs/blob/master/src/types/local-date-time.ts) |
| local date       | [LocalDate](https://github.com/huan231/toml-nodejs/blob/master/src/types/local-date.ts)          |
| local time       | [LocalTime](https://github.com/huan231/toml-nodejs/blob/master/src/types/local-time.ts)          |
| array            | [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)  |
| inline table     | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#objects)        |

## License

This project is licensed under the terms of
the [MIT license](https://github.com/huan231/toml-nodejs/blob/master/LICENSE).
