const { textify, typeof: getType } = require('../index');

// =============================================================
describe('textify — primitives', () => {
  test('null', () => expect(textify(null)).toBe('null'));
  test('undefined', () => expect(textify(undefined)).toBe('undefined'));
  test('true', () => expect(textify(true)).toBe('true'));
  test('false', () => expect(textify(false)).toBe('false'));
  test('integer', () => expect(textify(42)).toBe('42'));
  test('float', () => expect(textify(3.14)).toBe('3.14'));
  test('zero', () => expect(textify(0)).toBe('0'));
  test('negative', () => expect(textify(-1)).toBe('-1'));
});

// =============================================================
describe('textify — strings', () => {
  test('plain string', () => expect(textify('hello')).toBe('hello'));
  test('empty string', () => expect(textify('')).toBe(''));

  test('limit truncates long string', () => {
    const result = textify('abcdefghij', { limit: 5 });
    expect(result).toBe('abcde...');
  });

  test('limit does not truncate short string', () => {
    const result = textify('abc', { limit: 5 });
    expect(result).toBe('abc');
  });

  test('limit exact length — not truncated', () => {
    const result = textify('abcde', { limit: 5 });
    expect(result).toBe('abcde');
  });
});

// =============================================================
describe('textify — string dates', () => {
  test('ISO date string is reformatted', () => {
    const result = textify('2024-01-15 10:30:00', { dateformat: 'YYYY/MM/DD' });
    expect(result).toBe('2024/01/15');
  });

  test('ISO date with T separator', () => {
    const result = textify('2024-06-01T12:00:00', { dateformat: 'DD.MM.YYYY' });
    expect(result).toBe('01.06.2024');
  });

  test('non-date string is not reformatted', () => {
    const result = textify('not-a-date', { dateformat: 'YYYY-MM-DD' });
    expect(result).toBe('not-a-date');
  });

  test('dateformat: false — string date is not reformatted', () => {
    const raw = '2024-01-15 10:30:00';
    const result = textify(raw, { dateformat: false });
    expect(result).toBe(raw);
  });
});

// =============================================================
describe('textify — Date objects', () => {
  test('Date formatted with default format', () => {
    const d = new Date('2024-03-05T08:00:00.000Z');
    const result = textify(d, { dateformat: 'YYYY-MM-DD' });
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('Date uses dateformat option', () => {
    const d = new Date('2024-03-05T00:00:00.000Z');
    const result = textify(d, { dateformat: 'DD/MM/YYYY' });
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

// =============================================================
describe('textify — objects', () => {
  test('simple object', () => {
    expect(textify({ id: 'abc' })).toEqual(`{ id: 'abc' }`);
  });

  test('nested object', () => {
    expect(textify({ a: { b: 2 } })).toEqual('{ a: { b: 2 } }');
  });

  test('array', () => {
    expect(textify([1, 2, 3])).toEqual('[ 1, 2, 3 ]');
  });
});

// =============================================================
describe('textify — sort', () => {
  test('sort: true sorts keys alphabetically', () => {
    const result = textify({ z: 1, a: 2, m: 3 }, { sort: true });
    const aPos = result.indexOf('a:');
    const mPos = result.indexOf('m:');
    const zPos = result.indexOf('z:');
    expect(aPos).toBeLessThan(mPos);
    expect(mPos).toBeLessThan(zPos);
  });

  test('autosort: true puts primitives before objects', () => {
    const obj = { nested: { x: 1 }, name: 'foo', age: 30 };
    const result = textify(obj, { autosort: true });
    const namePos = result.indexOf('name:');
    const agePos = result.indexOf('age:');
    const nestedPos = result.indexOf('nested:');
    expect(Math.max(namePos, agePos)).toBeLessThan(nestedPos);
  });
});

// =============================================================
describe('textify — skipunderscore', () => {
  test('autosort with skipunderscore omits _ keys', () => {
    const obj = { _id: 1, name: 'foo', _secret: 'bar' };
    const result = textify(obj, { autosort: true, skipunderscore: true });
    expect(result).toContain('name:');
    expect(result).not.toContain('_id:');
    expect(result).not.toContain('_secret:');
  });
});

// =============================================================
describe('textify — crlf', () => {
  test('crlf: false collapses newlines to spaces', () => {
    const obj = { longKeyAlpha: 'value1', longKeyBeta: 'value2', longKeyGamma: 'value3', longKeyDelta: 'value4' };
    const result = textify(obj, { crlf: false });
    expect(result).not.toContain('\n');
  });

  test('crlf: true (default) preserves newlines for large objects', () => {
    // util.inspect breaks to multiple lines only when output exceeds ~72 chars
    const obj = { longKeyAlpha: 'value1', longKeyBeta: 'value2', longKeyGamma: 'value3', longKeyDelta: 'value4' };
    const result = textify(obj);
    expect(result).toContain('\n');
  });
});

// =============================================================
describe('textify — limit on objects', () => {
  test('limit truncates long object output', () => {
    const big = { a: 'x'.repeat(200) };
    const result = textify(big, { limit: 20 });
    expect(result.endsWith('...')).toBe(true);
  });

  test('limit does not truncate short object output', () => {
    const result = textify({ a: 1 }, { limit: 1000 });
    expect(result.endsWith('...')).toBe(false);
  });
});

// =============================================================
describe('textify — no options', () => {
  test('called without second argument', () => {
    expect(() => textify({ a: 1 })).not.toThrow();
  });

  test('called with empty options object', () => {
    expect(() => textify({ a: 1 }, {})).not.toThrow();
  });
});

// =============================================================
describe('getType', () => {
  test('string', () => expect(getType('hello')).toBe('string (5 chars)'));
  test('empty string', () => expect(getType('')).toBe('string (0 chars)'));
  test('number', () => expect(getType(42)).toBe('number'));
  test('boolean', () => expect(getType(true)).toBe('boolean'));
  test('undefined', () => expect(getType(undefined)).toBe('undefined'));
  test('null', () => expect(getType(null)).toBe('object (null)'));

  test('object', () => {
    expect(getType({ a: 1, b: 2 })).toBe('object (2 keys)');
  });

  test('empty object', () => {
    expect(getType({})).toBe('object (0 keys)');
  });

  test('empty array', () => {
    expect(getType([])).toBe('array (0 items)');
  });

  test('array of same type', () => {
    expect(getType([1, 2, 3])).toBe('array (3 items of number)');
  });

  test('array of mixed types', () => {
    const result = getType([1, 'two', true]);
    expect(result).toMatch(/array \(3 items of/);
    expect(result).toContain('number');
    expect(result).toContain('string');
    expect(result).toContain('boolean');
  });
});
