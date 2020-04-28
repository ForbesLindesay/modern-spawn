import * as spawn from '../';

for (const [stdout, stderr, status] of [
  ['hello', 'world', 0],
  ['hello', 'world', 1],
] as const) {
  describe(`${stdout}, ${stderr}, ${status}`, () => {
    for (const [name, implementation] of [
      [
        'spawnBuffered',
        () =>
          spawn.spawnBuffered('node', [
            `${__dirname}/child`,
            stdout,
            stderr,
            `${status}`,
          ]),
      ],
      [
        'spawnBufferedSync',
        () =>
          spawn.spawnBufferedSync('node', [
            `${__dirname}/child`,
            stdout,
            stderr,
            `${status}`,
          ]),
      ],
      [
        'execBuffered',
        () =>
          spawn.execBuffered(
            `node "${__dirname}/child" "${stdout}" "${stderr}" ${status}`,
          ),
      ],
      [
        'execBufferedSync',
        () =>
          spawn.execBufferedSync(
            `node "${__dirname}/child" "${stdout}" "${stderr}" ${status}`,
          ),
      ],
    ] as const) {
      test(name, async () => {
        const result = await implementation();
        expect(result.stdout.toString('utf8')).toBe(stdout);
        // TODO: figure out a way to remove this exception
        if (!(name === 'execBufferedSync' && status === 0)) {
          expect(result.stderr.toString('utf8')).toBe(stderr);
        }
        expect(result.status).toBe(status);
      });
    }
  });
}
