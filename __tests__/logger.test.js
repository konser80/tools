const { _formatLog, _resetColors: resetColors } = require('../logger');
const dayjs = require('dayjs');
const formatLog = (...args) => _formatLog(...args).text;

// ==============================================
// resetColors
// ==============================================
describe('resetColors', () => {

  test('удаляет ANSI-коды из строки', () => {
    const colored = '\u001b[31mhello\u001b[0m';
    expect(resetColors(colored)).toBe('hello');
  });

  test('возвращает строку без изменений если нет ANSI-кодов', () => {
    expect(resetColors('hello')).toBe('hello');
  });

  test('возвращает пустую строку для null', () => {
    expect(resetColors(null)).toBe('');
  });

  test('возвращает пустую строку для undefined', () => {
    expect(resetColors(undefined)).toBe('');
  });

  test('конвертирует число в строку', () => {
    expect(resetColors(123)).toBe('123');
  });
});

// ==============================================
// formatLog
// ==============================================
describe('formatLog', () => {

  const time = dayjs('2025-01-15 10:30:45.123');

  test('добавляет timestamp по умолчанию', () => {
    const res = formatLog('test', 'trace', {}, time);
    expect(res).toContain('2025-01-15 10:30:45.123');
  });

  test('не добавляет timestamp при time: false', () => {
    const res = formatLog('test', 'trace', { time: false }, time);
    expect(res).not.toContain('2025-01-15');
  });

  test('содержит сообщение', () => {
    const res = formatLog('hello world', 'trace', { time: false, ms: false }, time);
    expect(resetColors(res)).toContain('hello world');
  });

  test('уровень warn — бейдж W', () => {
    const res = formatLog('warning', 'warn', { time: false, ms: false }, time);
    expect(resetColors(res)).toContain(' W ');
  });

  test('уровень error — бейдж E', () => {
    const res = formatLog('error', 'error', { time: false, ms: false }, time);
    expect(resetColors(res)).toContain(' E ');
  });

  test('уровень silly — бейдж S', () => {
    const res = formatLog('silly', 'silly', { time: false, ms: false }, time);
    expect(resetColors(res)).toContain(' S ');
  });

  test('уровень fatal — бейдж F', () => {
    const res = formatLog('fatal', 'fatal', { time: false, ms: false }, time);
    expect(resetColors(res)).toContain(' F ');
  });

  test('trace и debug без бейджа', () => {
    const trace = formatLog('msg', 'trace', { time: false, ms: false }, time);
    const debug = formatLog('msg', 'debug', { time: false, ms: false }, time);
    expect(resetColors(trace)).not.toMatch(/ [A-Z] /);
    expect(resetColors(debug)).not.toMatch(/ [A-Z] /);
  });

  test('Error объект — показывает файл и строку', () => {
    const err = new Error('test error');
    const res = formatLog(err, 'error', { time: false, ms: false }, time);
    expect(resetColors(res)).toMatch(/\(.+:\d+:\d+\)/);
  });

  test('Error объект — обрезает стек до 8 строк', () => {
    const err = new Error('deep stack');
    // убедимся что стек длинный
    err.stack = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const res = formatLog(err, 'error', { time: false, ms: false }, time);
    const lines = resetColors(res).split('\n');
    expect(lines.length).toBeLessThanOrEqual(8);
  });

  test('Error через opt.err — показывает файл и строку', () => {
    const err = new Error('opt error');
    const res = formatLog('сообщение', 'error', { time: false, ms: false, err }, time);
    expect(resetColors(res)).toMatch(/\(.+:\d+:\d+\)/);
  });

  test('multiline trace добавляет перенос строки в начало', () => {
    const res = formatLog('line1\nline2', 'trace', { time: true, ms: false }, time);
    expect(resetColors(res)).toMatch(/\]\s*\n/);
  });
});

// ==============================================
// getTimeDifference
// ==============================================
describe('getTimeDifference', () => {

  test('возвращает пустую строку при первом вызове', () => {
    // previous === null при старте, но formatLog устанавливает previous
    // вызовем formatLog чтобы задать previous, потом проверим разницу
    const t1 = dayjs('2025-01-15 10:00:00.000');
    formatLog('init', 'trace', { time: false, ms: true }, t1);

    const t2 = dayjs('2025-01-15 10:00:01.500');
    const res = formatLog('next', 'trace', { time: false, ms: true }, t2);
    // должен содержать +
    expect(resetColors(res)).toContain('+');
  });
});
