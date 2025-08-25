const val = require('../value');
// const core = require('../core/core');

// const round = helper.round;
// eslint-disable-next-line prefer-destructuring


describe('val', () => {
  test('returns number for string number', () => {
    expect(val('123')).toBe(123);
    expect(val('123.45')).toBe(123.45);
    expect(val('123.45 ')).toBe(123.45);
    expect(val(' 123.45 ')).toBe(123.45);
    expect(val('-0.55')).toBe(-0.55);
    expect(val('0')).toBe(0);
    expect(val('0.0')).toBe(0);
  });

  test('returns boolean for "true"/"false"', () => {
    expect(val('true')).toBe(true);
    expect(val('  TRUE  ')).toBe(true);
    expect(val('false')).toBe(false);
    expect(val('FALSE')).toBe(false);
  });

  test('returns null for "null"', () => {
    expect(val('null')).toBeNull();
    expect(val('  Null  ')).toBeNull();
  });

  test('trims string', () => {
    expect(val('  some text  ')).toBe('some text');
  });

  test('returns original value for non-string', () => {
    expect(val(true)).toBe(true);
    expect(val(false)).toBe(false);
    expect(val(null)).toBe(null);
    expect(val(undefined)).toBe(undefined);
    expect(val(123)).toBe(123);
    expect(val({})).toEqual({});
    expect(val([])).toEqual([]);
  });

  test('returns def if value is undefined or null', () => {
    expect(val(undefined, 5)).toBe(5);
    expect(val(null, 7)).toBe(7);
    expect(val('null', 8)).toBeNull();
    expect(val('', 10)).toBe('');
  });

  test('returns string for non-matching string', () => {
    expect(val('hello')).toBe('hello');
    expect(val('123abc')).toBe('123abc');
    expect(val('false positive')).toBe('false positive');
  });

  test('does not convert "+" numbers', () => {
    expect(val('+5')).toBe('+5');
    expect(val('+123.45')).toBe('+123.45');
  });

  test('does not convert string ending with dot', () => {
    expect(val('12.')).toBe('12.');
  });

  // можно добавить тест на validator.isFloat с экспонентой
  test('handles numbers in exponent form if validator supports', () => {
    // если validator.isFloat('1e3') === true
    expect(val('1e3')).toBe(1000); // если нет — строка
    // expect(val('1e3')).toBe('1e3');
  });
});
