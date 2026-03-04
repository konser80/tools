const logger = require('./logger');

console.debug('debug: серый текст');
console.log('log/trace: синий текст');
console.info('info/debug: серый текст');
console.warn('warn: жёлтый с бейджем W');
console.error('error: красный с бейджем E');

console.log({ name: 'Konser', age: 30, nested: { a: 1, b: [1, 2, 3] } });
console.log(['один', 'два', 'три']);
console.log(null);
console.log(undefined);
console.log(12345);
console.log(true);
console.error(new Error('тестовая ошибка'));

console.log('аргумент 1', 'аргумент 2', 'аргумент 3');

// пауза чтобы увидеть +diff
setTimeout(() => {
  console.log('после паузы 500ms — должен показать +diff');

  // === configureLogger ===
  console.log('\n--- configureLogger ---\n');
  const log = logger('trace', { dir: 'logs' });

  log.silly('silly: циановый с бейджем S');
  log.trace('trace: синий');
  log.debug('debug: серый');
  log.warn('warn: жёлтый с бейджем W');
  log.error('error: красный с бейджем E');
  log.fatal('fatal: с бейджем F');

  log.info({ key: 'value', arr: [1, 2, 3] }, { colors: true });
  log.trace('trace с ms');
  log.trace('trace без ms', { ms: false });
  log.error(new Error('ошибка через logger'));
  log.trace('многострочный\nтекст\nдолжен начинаться\nс новой строки');

  console.log('console.log родной (перехвачен)');

  setTimeout(() => {
    log.trace('после паузы 300ms');
    log.shutdown(() => {});
  }, 300);

}, 500);
