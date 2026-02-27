const { val } = require('../index');

describe('null / undefined', () => {

  test('undefined returns undefined when no default', () => {
    expect(val(undefined)).toBeUndefined();
  });

  test('undefined returns default', () => {
    expect(val(undefined, 'fallback')).toBe('fallback');
  });

  test('null returns null when no default', () => {
    expect(val(null)).toBeNull();
  });

  test('null returns default', () => {
    expect(val(null, 0)).toBe(0);
  });

});

describe('non-string passthrough', () => {

  test('number returned as-is', () => {
    expect(val(42)).toBe(42);
  });

  test('boolean returned as-is', () => {
    expect(val(true)).toBe(true);
    expect(val(false)).toBe(false);
  });

  test('object returned as-is', () => {
    const obj = { a: 1 };
    expect(val(obj)).toBe(obj);
  });

  test('array returned as-is', () => {
    const arr = [1, 2, 3];
    expect(val(arr)).toBe(arr);
  });

});

describe('empty string', () => {

  test('empty string returns empty string', () => {
    expect(val('')).toBe('');
  });

  test('whitespace-only string returns empty string', () => {
    expect(val('   ')).toBe('');
  });

});

describe('boolean strings', () => {

  test('"true" => true', () => {
    expect(val('true')).toBe(true);
  });

  test('"false" => false', () => {
    expect(val('false')).toBe(false);
  });

  test('"True" => true (case-insensitive)', () => {
    expect(val('True')).toBe(true);
  });

  test('"FALSE" => false (case-insensitive)', () => {
    expect(val('FALSE')).toBe(false);
  });

  test('"null" => null', () => {
    expect(val('null')).toBeNull();
  });

  test('"NULL" => null (case-insensitive)', () => {
    expect(val('NULL')).toBeNull();
  });

  test('boolean/null strings with surrounding whitespace', () => {
    expect(val('  TRUE  ')).toBe(true);
    expect(val('  Null  ')).toBeNull();
  });

});

describe('integer strings', () => {

  test('positive integer', () => {
    expect(val('42')).toBe(42);
  });

  test('negative integer', () => {
    expect(val('-7')).toBe(-7);
  });

  test('zero', () => {
    expect(val('0')).toBe(0);
  });

});

describe('float strings', () => {

  test('positive float', () => {
    expect(val('3.14')).toBe(3.14);
  });

  test('negative float', () => {
    expect(val('-0.5')).toBe(-0.5);
  });

  test('leading dot', () => {
    expect(val('.75')).toBe(0.75);
  });

});

describe('strings kept as-is', () => {

  test('phone number with +', () => {
    expect(val('+79001234567')).toBe('+79001234567');
  });

  test('hex literal', () => {
    expect(val('0x1A3F')).toBe('0x1A3F');
  });

  test('octal literal', () => {
    expect(val('0o777')).toBe('0o777');
  });

  test('binary literal', () => {
    expect(val('0b1010')).toBe('0b1010');
  });

  test('exponential notation', () => {
    expect(val('1e12')).toBe('1e12');
    expect(val('12E8')).toBe('12E8');
  });

  test('trailing dot', () => {
    expect(val('42.')).toBe('42.');
  });

  test('plain word string', () => {
    expect(val('hello')).toBe('hello');
  });

  test('alphanumeric string', () => {
    expect(val('abc123')).toBe('abc123');
  });

  test('Infinity string', () => {
    expect(val('Infinity')).toBe('Infinity');
  });

  test('-Infinity string', () => {
    expect(val('-Infinity')).toBe('-Infinity');
  });

});

describe('default value fallback', () => {

  test('unparseable string ignores default', () => {
    expect(val('42abc', 0)).toBe('42abc');
  });

  test('unparseable string returns trimmed string when no default', () => {
    expect(val('not-a-number')).toBe('not-a-number');
  });

  test('whitespace trimmed before returning', () => {
    expect(val('  hello  ')).toBe('hello');
  });

  test('numeric string with spaces trimmed and parsed', () => {
    expect(val('  99  ')).toBe(99);
  });

});
