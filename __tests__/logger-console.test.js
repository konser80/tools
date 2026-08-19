const { runChild } = require('./helpers/runchild');

// ==============================================
// configureLogger перенаправляет console.* в log4js.
// console.debug исторически пропускали: он оставался обёрткой из
// configureConsole и писал в нативный stdout мимо файлов
// ==============================================
describe('console.* → файлы', () => {

  test('console.debug попадает в trace.log', () => {
    const res = runChild(`
      console.debug('MARKER-console-debug');
      log.exit(0);
    `);

    expect(res.stdout).toContain('MARKER-console-debug');
    expect(res.tracelog).toContain('MARKER-console-debug');
  });

  test('все методы console попадают в trace.log', () => {
    const res = runChild(`
      console.log('MARKER-log');
      console.info('MARKER-info');
      console.debug('MARKER-debug');
      console.warn('MARKER-warn');
      console.error('MARKER-error');
      log.exit(0);
    `);

    ['MARKER-log', 'MARKER-info', 'MARKER-debug', 'MARKER-warn', 'MARKER-error']
      .forEach((marker) => expect(res.tracelog).toContain(marker));
  });

  test('console.warn и console.error попадают в error.log, остальные — нет', () => {
    const res = runChild(`
      console.debug('MARKER-debug');
      console.warn('MARKER-warn');
      console.error('MARKER-error');
      log.exit(0);
    `);

    expect(res.errorlog).toContain('MARKER-warn');
    expect(res.errorlog).toContain('MARKER-error');
    expect(res.errorlog).not.toContain('MARKER-debug');
  });

  test('console.debug форматируется как log.debug', () => {
    const viaConsole = runChild(`
      console.debug('MARKER-same');
      log.exit(0);
    `);
    const viaLogger = runChild(`
      log.debug('MARKER-same');
      log.exit(0);
    `);

    const strip = (s) => s.replace(/\[[\d-]{10} [\d:.]{12}\]/, '[TIME]');
    expect(strip(viaConsole.tracelog)).toBe(strip(viaLogger.tracelog));
  });

  test('дополнительные аргументы console.debug не роняют логгер', () => {
    const res = runChild(`
      console.debug('MARKER-args', { a: 1 }, 'tail');
      log.exit(0);
    `);

    expect(res.code).toBe(0);
    expect(res.tracelog).toContain('MARKER-args');
  });

});
