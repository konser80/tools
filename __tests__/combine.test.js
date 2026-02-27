const { combine } = require('../index');

describe('fixed values', () => {

  test('single fixed scalar', () => {
    expect(combine({ color: 'brown' })).toEqual([{ color: 'brown' }]);
  });

  test('multiple fixed scalars', () => {
    expect(combine({ a: 1, b: 2 })).toEqual([{ a: 1, b: 2 }]);
  });

});

describe('range generation', () => {

  test('simple range', () => {
    expect(combine({ x: { from: 1, to: 3, step: 1 } })).toEqual([
      { x: 1 }, { x: 2 }, { x: 3 },
    ]);
  });

  test('range with step', () => {
    expect(combine({ age: { from: 18, to: 28, step: 5 } })).toEqual([
      { age: 18 }, { age: 23 }, { age: 28 },
    ]);
  });

  test('range with default step 1', () => {
    expect(combine({ n: { from: 10, to: 12 } })).toEqual([
      { n: 10 }, { n: 11 }, { n: 12 },
    ]);
  });

  test('single-value range (from === to)', () => {
    expect(combine({ x: { from: 5, to: 5, step: 1 } })).toEqual([{ x: 5 }]);
  });

});

describe('array values', () => {

  test('single array key', () => {
    expect(combine({ color: ['red', 'green', 'blue'] })).toEqual([
      { color: 'red' },
      { color: 'green' },
      { color: 'blue' },
    ]);
  });

  test('array mixed with fixed', () => {
    const result = combine({ color: ['red', 'blue'], size: 'M' });
    expect(result).toEqual([
      { color: 'red', size: 'M' },
      { color: 'blue', size: 'M' },
    ]);
  });

});

describe('cartesian product', () => {

  test('two ranges produce correct count', () => {
    const result = combine({
      age: { from: 18, to: 28, step: 5 },    // 18, 23, 28 → 3
      height: { from: 162, to: 168, step: 3 }, // 162, 165, 168 → 3
    });
    expect(result).toHaveLength(9);
  });

  test('range + fixed + range', () => {
    const result = combine({
      age: { from: 18, to: 35, step: 5 },     // 18,23,28,33 → 4
      height: { from: 162, to: 168, step: 3 }, // 162,165,168 → 3
      color: 'brown',
    });
    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({ age: 18, height: 162, color: 'brown' });
    expect(result[11]).toEqual({ age: 33, height: 168, color: 'brown' });
    result.forEach((item) => expect(item.color).toBe('brown'));
  });

});

describe('dependent ranges (from: "key")', () => {

  test('sma2 starts from current sma1 value', () => {
    const result = combine({
      sma1: { from: 50, to: 100, step: 10 }, // 6 values
      sma2: { from: 'sma1', to: 100, step: 10 },
      fixed: 75,
    });
    // sma1=50: sma2 50..100 → 6, sma1=60: 5, ..., sma1=100: 1 → total 21
    expect(result).toHaveLength(21);
    result.forEach(({ sma1, sma2 }) => {
      expect(sma2).toBeGreaterThanOrEqual(sma1);
    });
    expect(result[0]).toEqual({ sma1: 50, sma2: 50, fixed: 75 });
  });

  test('sma2 never less than sma1', () => {
    const result = combine({
      sma1: { from: 10, to: 30, step: 10 },
      sma2: { from: 'sma1', to: 30, step: 10 },
    });
    result.forEach(({ sma1, sma2 }) => {
      expect(sma2).toBeGreaterThanOrEqual(sma1);
    });
  });

});
