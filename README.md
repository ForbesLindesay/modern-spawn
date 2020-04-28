# modern-spawn

A set of spawn and exec functions that match the API you need 90% of the time in modern applications.

## Installation

```
yarn add modern-spawn
```

## Usage

```ts
import {spawnBuffered} from 'modern-spawn';

const hello = await spawnBuffered('echo', ['hello world']).getResult('utf8');

console.log(hello);
```

## API

```ts
export interface Result {
  readonly command: string;
  readonly args: readonly string[] | undefined;

  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly status: number | null;

  getResult(): Buffer;
  getResult(encoding: string): string;
}

export interface ResultPromise extends Promise<Result> {
  getResult(): Promise<Buffer>;
  getResult(encoding: string): Promise<string>;
}

export interface SpawnBufferedOptions extends SpawnOptions {
  debug?:
    | boolean
    | {
        stdout?: boolean;
        stderr?: boolean;
      };
}

export function spawnBuffered(
  command: string,
  args: string[],
  opts?: SpawnBufferedOptions,
): ResultPromise;

export function spawnBufferedSync(
  command: string,
  args: string[],
  opts: SpawnBufferedOptions,
): Result;

export interface ExecBufferedOptions extends ExecOptions {
  debug?:
    | boolean
    | {
        stdout?: boolean;
        stderr?: boolean;
      };
}

export function execBuffered(
  command: string,
  options?: ExecBufferedOptions,
): ResultPromise;

export function execBufferedSync(
  command: string,
  options?: ExecBufferedOptions,
): Result;
```

- `getResult` can be used to request `stdout` as either a Buffer or string and automatically throw an error with plenty of context if the process exited with a non-zero status code.
- set `debug` to `true` if you want to pipe log stdout & stderr to the parent process for debugging, in addition to buffering it.
- `execBufferedSync` does returns an empty Buffer for `stderr` unless the process exits with a non-zero exit code. This is due to a limitation of the node.js API.
