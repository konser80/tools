const { init, forEachAsyncFn } = require('../arrays');

// eslint-disable-next-line no-undef
beforeAll(() => {
  init();
});

describe('forEachAsyncFn', () => {

  test('iterates over all elements in order', async () => {
    const result = [];
    await forEachAsyncFn.call([1, 2, 3], (item) => { result.push(item); });
    expect(result).toEqual([1, 2, 3]);
  });

  test('passes index to callback', async () => {
    const indices = [];
    await forEachAsyncFn.call(['a', 'b', 'c'], (item, i) => { indices.push(i); });
    expect(indices).toEqual([0, 1, 2]);
  });

  test('awaits async callbacks sequentially', async () => {
    const result = [];
    await forEachAsyncFn.call([10, 20, 30], async (item) => {
      await Promise.resolve();
      result.push(item);
    });
    expect(result).toEqual([10, 20, 30]);
  });

  test('works on empty array', async () => {
    const result = [];
    await forEachAsyncFn.call([], (item) => { result.push(item); });
    expect(result).toEqual([]);
  });

});

describe('Array.prototype.forEachAsync', () => {

  test('is defined on arrays after init()', () => {
    expect(typeof [].forEachAsync).toBe('function');
  });

  test('is non-enumerable', () => {
    expect(Object.keys([])).not.toContain('forEachAsync');
  });

  test('iterates via prototype', async () => {
    const result = [];
    await [4, 5, 6].forEachAsync((item) => { result.push(item); });
    expect(result).toEqual([4, 5, 6]);
  });

});
