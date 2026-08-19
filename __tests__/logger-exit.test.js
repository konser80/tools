const os = require('os');
const { runChild } = require('./helpers/runchild');

// ==============================================
describe('log.exit', () => {

  test('дописывает последние строки в error.log перед выходом', () => {
    const res = runChild(`
      log.error('MARKER-error-last-line');
      log.fatal('MARKER-fatal-last-line');
      log.exit(1);
    `);

    expect(res.code).toBe(1);
    expect(res.errorlog).toContain('MARKER-error-last-line');
    expect(res.errorlog).toContain('MARKER-fatal-last-line');
  });

  test('дописывает последние строки в trace.log перед выходом', () => {
    const res = runChild(`
      log.trace('MARKER-trace-last-line');
      log.exit(0);
    `);

    expect(res.code).toBe(0);
    expect(res.tracelog).toContain('MARKER-trace-last-line');
  });

  test('без аргумента завершает процесс с кодом 0', () => {
    const res = runChild(`
      log.error('MARKER-nocode');
      log.exit();
    `);

    expect(res.code).toBe(0);
    expect(res.errorlog).toContain('MARKER-nocode');
  });

  test('повторный вызов не ломает выход', () => {
    const res = runChild(`
      log.error('MARKER-double');
      log.exit(3);
      log.exit(4);
    `);

    expect(res.code).toBe(3);
    expect(res.errorlog).toContain('MARKER-double');
  });

});

// ==============================================
describe('log.shutdown', () => {

  test('без колбэка возвращает промис и дописывает данные', () => {
    const res = runChild(`
      log.error('MARKER-promise');
      log.shutdown().then(() => process.exit(7));
    `);

    expect(res.code).toBe(7);
    expect(res.errorlog).toContain('MARKER-promise');
  });

  test('с колбэком сохраняет старую сигнатуру', () => {
    const res = runChild(`
      log.error('MARKER-callback');
      log.shutdown(() => process.exit(8));
    `);

    expect(res.code).toBe(8);
    expect(res.errorlog).toContain('MARKER-callback');
  });

});

// ==============================================
// таймаут: если log4js не отвечает (например, диск полон),
// shutdown обязан всё равно вызвать колбэк, а не подвесить процесс
// ==============================================
describe('log.shutdown timeout', () => {

  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };

  afterEach(() => {
    Object.assign(console, original);
    jest.resetModules();
    jest.dontMock('log4js');
  });

  test('вызывает колбэк с ошибкой если log4js не отвечает', (done) => {
    jest.resetModules();
    jest.doMock('log4js', () => ({
      addLayout: () => {},
      configure: () => {},
      getLogger: () => ({ trace: () => {}, debug: () => {}, warn: () => {}, error: () => {}, fatal: () => {} }),
      shutdown: () => {}, // колбэк не приходит никогда
    }));

    const configureLogger = require('../logger');
    const log = configureLogger('silly', { dir: os.tmpdir() });

    const started = Date.now();
    log.shutdown((err) => {
      expect(err).toBeInstanceOf(Error);
      expect(Date.now() - started).toBeLessThan(1000);
      done();
    }, 50);
  });

});
