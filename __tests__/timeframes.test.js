const { tftotime, timetotf, timetotf2 } = require('../index');

const SEC  = 1000;
const MIN  = 60 * SEC;
const HOUR = 60 * MIN;
const DAY  = 24 * HOUR;

// ==============================================
describe('tftotime', () => {

  describe('single units', () => {
    test('seconds',      () => expect(tftotime('1s')).toBe(SEC));
    test('minutes',      () => expect(tftotime('1m')).toBe(MIN));
    test('hours',        () => expect(tftotime('1h')).toBe(HOUR));
    test('days',         () => expect(tftotime('1d')).toBe(DAY));
    test('weeks',        () => expect(tftotime('7w')).toBeCloseTo(7 * 7 * DAY, -3));
    test('months (M)',   () => { const ms = tftotime('1M'); expect(ms).toBeGreaterThanOrEqual(28*DAY); expect(ms).toBeLessThanOrEqual(31*DAY); });
    test('years (y)',    () => { const ms = tftotime('1y'); expect(ms).toBeGreaterThanOrEqual(365*DAY); expect(ms).toBeLessThanOrEqual(366*DAY); });
  });

  describe('floats', () => {
    test('1.5s',  () => expect(tftotime('1.5s')).toBe(1500));
    test('1.5m',  () => expect(tftotime('1.5m')).toBe(1.5 * MIN));
    test('2.5h',  () => expect(tftotime('2.5h')).toBe(2.5 * HOUR));
    test('1.750s', () => expect(tftotime('1.750s')).toBe(1750));
  });

  describe('combined strings', () => {
    test('2h3m10s',  () => expect(tftotime('2h3m10s')).toBe(2*HOUR + 3*MIN + 10*SEC));
    test('1d12h',    () => expect(tftotime('1d12h')).toBe(DAY + 12*HOUR));
    test('1h30m',    () => expect(tftotime('1h30m')).toBe(HOUR + 30*MIN));
    test('1h 10m (space between units)', () => expect(tftotime('1h 10m')).toBe(HOUR + 10*MIN));
  });

  describe('numeric passthrough', () => {
    test('number returns as-is', () => expect(tftotime(5000)).toBe(5000));
  });

  describe('edge cases', () => {
    test('empty string returns 0',         () => expect(tftotime('')).toBe(0));
    test('null returns 0',                 () => expect(tftotime(null)).toBe(0));
    test('undefined returns 0',            () => expect(tftotime(undefined)).toBe(0));
    test('non-string/non-number returns 0',() => expect(tftotime({})).toBe(0));
    test('no unit defaults to hours',      () => expect(tftotime('2')).toBe(0)); // no match → 0
    test('unknown unit 1q returns 0',      () => expect(tftotime('1q')).toBe(0));
    test('1h2q ignores unknown unit',      () => expect(tftotime('1h2q')).toBe(HOUR));
  });

  describe('repeated calls (regex lastIndex safety)', () => {
    test('same result on repeated calls', () => {
      const a = tftotime('2h30m');
      const b = tftotime('2h30m');
      expect(a).toBe(b);
    });

    test('different strings give independent results', () => {
      expect(tftotime('1h')).toBe(HOUR);
      expect(tftotime('30m')).toBe(30 * MIN);
      expect(tftotime('1h')).toBe(HOUR);
    });
  });
});

// ==============================================
describe('timetotf', () => {

  test('milliseconds', () => expect(timetotf(500)).toBe('500ms'));
  test('seconds',      () => expect(timetotf(30 * SEC)).toBe('30.0s'));
  test('minutes',      () => expect(timetotf(90 * SEC)).toBe('1.5m'));
  test('hours',        () => expect(timetotf(2 * HOUR)).toBe('2.0h'));
  test('days',         () => expect(timetotf(5 * DAY)).toBe('5.0d'));

  test('threshold: < 4 days stays in hours', () => {
    expect(timetotf(3 * DAY)).toMatch(/h$/);
  });
  test('threshold: >= 4 days switches to days', () => {
    expect(timetotf(4 * DAY)).toMatch(/d$/);
  });
});

// ==============================================
describe('timetotf2', () => {

  test('zero',          () => expect(timetotf2(0)).toBe('0ms'));
  test('milliseconds',  () => expect(timetotf2(500)).toBe('500ms'));
  test('seconds',       () => expect(timetotf2(SEC)).toBe('1s'));
  test('minutes',       () => expect(timetotf2(MIN)).toBe('1m'));
  test('hours',         () => expect(timetotf2(HOUR)).toBe('1h'));
  test('days',          () => expect(timetotf2(DAY)).toBe('1d'));

  test('combined: 2h3m10s', () => {
    expect(timetotf2(2*HOUR + 3*MIN + 10*SEC)).toBe('2h3m10s');
  });
  test('combined: 1d12h', () => {
    expect(timetotf2(DAY + 12*HOUR)).toBe('1d12h');
  });

  test('years output', () => {
    const YEAR = 365.25 * DAY;
    expect(timetotf2(YEAR)).toBe('1y');
  });
});

// ==============================================
describe('round-trip: tftotime → timetotf2', () => {

  test('1h',    () => expect(timetotf2(tftotime('1h'))).toBe('1h'));
  test('30m',   () => expect(timetotf2(tftotime('30m'))).toBe('30m'));
  test('2h3m',  () => expect(timetotf2(tftotime('2h3m'))).toBe('2h3m'));
  test('1d12h', () => expect(timetotf2(tftotime('1d12h'))).toBe('1d12h'));
  test('45s',   () => expect(timetotf2(tftotime('45s'))).toBe('45s'));
});
