import {spawn, sync as spawnSync} from 'cross-spawn';
import {
  exec,
  ExecException,
  ChildProcess,
  SpawnOptionsWithoutStdio,
  ExecOptions,
  execSync,
  ExecSyncOptions,
} from 'child_process';
import {Readable} from 'stream';

async function getBuffer(
  stream: Readable | null,
  debug?: 'stdout' | 'stderr',
): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  return await new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    stream.on('error', reject);
    stream.on('data', (data) => {
      if (debug) process[debug].write(data);
      buffers.push(data);
    });
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function getStatusCode(cp: ChildProcess) {
  return await new Promise<number | null>((resolve, reject) => {
    cp.on('error', reject);
    cp.on('exit', (v) => resolve(v));
  });
}

export function formatCommand(command: string, args?: readonly string[]) {
  if (!args || !args.length) {
    return command;
  }
  return [command, ...args]
    .map((arg) =>
      / /.test(arg) ? (/\"/.test(arg) ? `'${arg}'` : `"${arg}"`) : arg,
    )
    .join(' ');
}

export class Result {
  public readonly command: string;
  public readonly args: readonly string[] | undefined;
  public readonly stdout: Buffer;
  public readonly stderr: Buffer;
  public readonly status: number | null;
  constructor(
    command: string,
    args: readonly string[] | undefined,
    stdout: Buffer,
    stderr: Buffer,
    status: number | null,
  ) {
    this.command = command;
    this.args = args;
    this.stdout = stdout;
    this.stderr = stderr;
    this.status = status;
  }
  public getResult(): Buffer;
  public getResult(encoding: string): string;
  public getResult(encoding?: string): Buffer | string;
  public getResult(encoding?: string) {
    if (this.status !== 0) {
      const err: any = new Error(
        `${formatCommand(this.command, this.args)} exited with code ${
          this.status
        }:\n${this.stderr.toString('utf8')}`,
      );
      err.code = 'NON_ZERO_EXIT_CODE';
      err.status = this.status;
      err.stdout = this.stdout;
      err.stderr = this.stderr;
      err.command = this.command;
      err.args = this.args;
      throw err;
    }
    if (encoding) {
      return this.stdout.toString(encoding);
    }
    return this.stdout;
  }
}

export interface ResultPromise extends Promise<Result> {
  getResult(): Promise<Buffer>;
  getResult(encoding: string): Promise<string>;
  getResult(encoding?: string): Promise<Buffer | string>;
}

function toResultPromise(p: Promise<Result>): ResultPromise {
  async function getResult(): Promise<Buffer>;
  async function getResult(str: string): Promise<string>;
  async function getResult(str?: string): Promise<Buffer | string> {
    return p.then((r) => r.getResult(str));
  }
  return Object.assign(p, {getResult});
}

export interface SpawnBufferedOptions extends SpawnOptionsWithoutStdio {
  debug?: boolean | {stdout?: boolean; stderr?: boolean};
}

export function spawnBuffered(
  command: string,
  args: string[],
  {debug, ...options}: SpawnBufferedOptions = {},
): ResultPromise {
  const childProcess = spawn(command, args, options);
  return toResultPromise(
    Promise.all([
      getBuffer(
        childProcess.stdout,
        debug === true || (debug && debug.stdout) ? 'stdout' : undefined,
      ),
      getBuffer(
        childProcess.stderr,
        debug === true || (debug && debug.stderr) ? 'stderr' : undefined,
      ),
      getStatusCode(childProcess),
    ] as const).then(([stdout, stderr, status]) => {
      return new Result(command, args, stdout, stderr, status);
    }),
  );
}
export function spawnBufferedSync(
  command: string,
  args: string[],
  {debug, ...options}: SpawnBufferedOptions = {},
): Result {
  const result = spawnSync(command, args, options);
  if (debug) {
    if (debug === true || debug.stdout) {
      process.stdout.write(result.stdout);
    }
    if (debug === true || debug.stderr) {
      process.stderr.write(result.stderr);
    }
  }
  if (result.error) throw result.error;
  return new Result(command, args, result.stdout, result.stderr, result.status);
}

export interface ExecBufferedOptions extends ExecOptions {
  debug?: boolean | {stdout?: boolean; stderr?: boolean};
}
export function execBuffered(
  command: string,
  {debug, windowsHide, ...options}: ExecBufferedOptions = {},
): ResultPromise {
  return toResultPromise(
    new Promise<[ExecException | null, Buffer, Buffer]>((resolve) => {
      exec(
        command,
        {...options, windowsHide: windowsHide !== false, encoding: 'buffer'},
        (err, stdout, stderr) => {
          resolve([err, stdout, stderr]);
        },
      );
    }).then(([err, stdout, stderr]) => {
      if (err && typeof err.code !== 'number') {
        throw err;
      }
      if (debug) {
        if (debug === true || debug.stdout) {
          process.stdout.write(stdout);
        }
        if (debug === true || debug.stderr) {
          process.stderr.write(stderr);
        }
      }
      return new Result(
        command,
        undefined,
        stdout,
        stderr,
        (err && err.code) || 0,
      );
    }),
  );
}

export interface ExecSyncBufferedOptions extends ExecSyncOptions {
  debug?: boolean | {stdout?: boolean; stderr?: boolean};
}
export function execBufferedSync(
  command: string,
  {debug, windowsHide, ...options}: ExecSyncBufferedOptions = {},
): Result {
  try {
    const stdout = execSync(command, {
      ...options,
      windowsHide: windowsHide !== false,
      ...(debug && (debug === true || debug.stdout) ? {} : {stdio: 'pipe'}),
    });
    if (debug) {
      if (debug === true || debug.stdout) {
        process.stdout.write(stdout);
      }
    }
    // TODO: get actual stderr rather than allocating an empty array
    return new Result(command, undefined, stdout, Buffer.alloc(0), 0);
  } catch (ex) {
    if (ex.status && ex.stdout && ex.stderr) {
      if (debug) {
        if (debug === true || debug.stdout) {
          process.stdout.write(ex.stdout);
        }
        if (debug === true || debug.stderr) {
          process.stderr.write(ex.stderr);
        }
      }
      return new Result(command, undefined, ex.stdout, ex.stderr, ex.status);
    }
    throw ex;
  }
}
