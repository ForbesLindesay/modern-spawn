var assert = require('assert');
var spawn = require('modern-spawn');

assert(
  spawn.spawnBufferedSync('echo', ['Hello World']).getResult('utf8').trim() ===
    'Hello World',
);

console.info('CommonJS tests passed');

if (parseInt(process.version.split('.')[0].substr(1), 10) >= 14) {
  const result = require('child_process').spawnSync('node', ['test.mjs'], {
    cwd: __dirname,
    stdio: 'inherit',
  });
  if (result.status) process.exit(result.status);
}
