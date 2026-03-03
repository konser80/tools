const dayjs = require('dayjs');

// We need fresh requires to avoid configureConsole() side effects clashing.
// So we test _formatLog directly from each module.

const ITERATIONS = 200_000;

// Warm up textify (shared dep) before benchmarks
const { textify } = require('../index');
textify('warmup');
textify({ a: 1, b: 'hello' });

describe('logger benchmark: dayjs vs native Date', () => {
  let formatLogDayjs;
  let formatLogNative;

  beforeAll(() => {
    formatLogDayjs = require('../logger')._formatLog;
    formatLogNative = require('../logger-nodayjs')._formatLog;
  });

  // Verify both produce equivalent output
  test('both versions produce same output structure', () => {
    const now = new Date();
    const dayjsNow = dayjs(now);

    const resDayjs = formatLogDayjs('hello world', 'trace', {}, dayjsNow);
    const resNative = formatLogNative('hello world', 'trace', {}, now);

    expect(resDayjs).toHaveProperty('text');
    expect(resDayjs).toHaveProperty('prefix');
    expect(resDayjs).toHaveProperty('data');
    expect(resDayjs).toHaveProperty('ms');

    expect(resNative).toHaveProperty('text');
    expect(resNative).toHaveProperty('prefix');
    expect(resNative).toHaveProperty('data');
    expect(resNative).toHaveProperty('ms');
  });

  test(`formatLog with dayjs — ${ITERATIONS.toLocaleString()} iterations`, () => {
    const dayjsNow = dayjs();
    // warmup
    for (let i = 0; i < 1000; i++) {
      formatLogDayjs('test message', 'trace', {}, dayjsNow);
    }

    const messages = ['simple string', 'another message', { key: 'value', num: 42 }, 12345, true];
    const levels = ['trace', 'debug', 'warn', 'error', 'silly'];

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      const msg = messages[i % messages.length];
      const level = levels[i % levels.length];
      formatLogDayjs(msg, level, {}, dayjsNow);
    }
    const end = process.hrtime.bigint();

    const ms = Number(end - start) / 1_000_000;
    const opsPerSec = Math.round(ITERATIONS / (ms / 1000));

    console.warn(`\n  ⏱  dayjs:  ${ms.toFixed(1)}ms for ${ITERATIONS.toLocaleString()} iterations (${opsPerSec.toLocaleString()} ops/sec)\n`);
  });

  test(`formatLog with native Date — ${ITERATIONS.toLocaleString()} iterations`, () => {
    const now = new Date();
    // warmup
    for (let i = 0; i < 1000; i++) {
      formatLogNative('test message', 'trace', {}, now);
    }

    const messages = ['simple string', 'another message', { key: 'value', num: 42 }, 12345, true];
    const levels = ['trace', 'debug', 'warn', 'error', 'silly'];

    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) {
      const msg = messages[i % messages.length];
      const level = levels[i % levels.length];
      formatLogNative(msg, level, {}, now);
    }
    const end = process.hrtime.bigint();

    const ms = Number(end - start) / 1_000_000;
    const opsPerSec = Math.round(ITERATIONS / (ms / 1000));

    console.warn(`\n  ⏱  native: ${ms.toFixed(1)}ms for ${ITERATIONS.toLocaleString()} iterations (${opsPerSec.toLocaleString()} ops/sec)\n`);
  });

  test('compare: new dayjs() vs new Date() — raw creation cost', () => {
    const N = 1_000_000;

    // dayjs()
    const start1 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) dayjs();
    const end1 = process.hrtime.bigint();
    const msDayjs = Number(end1 - start1) / 1_000_000;

    // new Date()
    const start2 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) new Date();
    const end2 = process.hrtime.bigint();
    const msDate = Number(end2 - start2) / 1_000_000;

    // dayjs().format()
    const start3 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
    const end3 = process.hrtime.bigint();
    const msDayjsFmt = Number(end3 - start3) / 1_000_000;

    // native format
    const pad2 = (n) => n < 10 ? '0' + n : '' + n;
    const pad3 = (n) => n < 10 ? '00' + n : n < 100 ? '0' + n : '' + n;
    const fmt = (d) => d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate())
      + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
      + '.' + pad3(d.getMilliseconds());

    const start4 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) fmt(new Date());
    const end4 = process.hrtime.bigint();
    const msNativeFmt = Number(end4 - start4) / 1_000_000;

    // dayjs.diff
    const a = dayjs();
    const b = dayjs(a).subtract(5, 'second');
    const start5 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) a.diff(b);
    const end5 = process.hrtime.bigint();
    const msDayjsDiff = Number(end5 - start5) / 1_000_000;

    // native diff
    const da = new Date();
    const db = new Date(da.getTime() - 5000);
    const start6 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) da.getTime() - db.getTime();
    const end6 = process.hrtime.bigint();
    const msNativeDiff = Number(end6 - start6) / 1_000_000;

    const ratio = (a, b) => `${(a/b).toFixed(1)}x`;

    console.warn(`
  ┌─────────────────────────────────┬───────────┬───────────┬─────────┐
  │ Operation (${N.toLocaleString()} iter)     │   dayjs   │  native   │  ratio  │
  ├─────────────────────────────────┼───────────┼───────────┼─────────┤
  │ create (dayjs() vs new Date())  │ ${msDayjs.toFixed(1).padStart(6)}ms │ ${msDate.toFixed(1).padStart(6)}ms │ ${ratio(msDayjs, msDate).padStart(5)}  │
  │ create + format                 │ ${msDayjsFmt.toFixed(1).padStart(6)}ms │ ${msNativeFmt.toFixed(1).padStart(6)}ms │ ${ratio(msDayjsFmt, msNativeFmt).padStart(5)}  │
  │ diff                            │ ${msDayjsDiff.toFixed(1).padStart(6)}ms │ ${msNativeDiff.toFixed(1).padStart(6)}ms │ ${ratio(msDayjsDiff, msNativeDiff).padStart(5)}  │
  └─────────────────────────────────┴───────────┴───────────┴─────────┘
`);
  });
});
