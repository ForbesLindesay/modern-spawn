import assert from 'assert';
import {spawnBufferedSync} from 'modern-spawn';

assert(
  spawnBufferedSync('echo', ['Hello World']).getResult('utf8') ===
    'Hello World',
);

console.info('TypeScript tests passed');
