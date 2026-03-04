const configureLogger = require('./logger');

const log = configureLogger('trace', { hourly: true });
// const log = configureLogger('trace', { prefix: `acc79151112233_`, hourly: true });
// const log = configureLogger('trace', { dir: 'logs', prefix: 'test-' });

let counter = 0;

setInterval(() => {
  counter += 1;
  log.trace(`[#${counter}] trace: всё идёт по плану, timestamp=${Date.now()}`);
  log.warn(`[#${counter}] warn: что-то подозрительное, memory=${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}, 10000);

log.info('Тестовый скрипт запущен, интервал 10 сек. Ctrl+C для выхода.');
