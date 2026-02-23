const tools = require('../index');

describe('re-exported external libraries', () => {

  test('logger is a function', () => {
    expect(typeof tools.logger).toBe('function');
  });

  test('textify is a function', () => {
    expect(typeof tools.textify).toBe('function');
  });

  test('typeof is a function', () => {
    expect(typeof tools.typeof).toBe('function');
  });

  test('tftotime is a function', () => {
    expect(typeof tools.tftotime).toBe('function');
  });

  test('timetotf is a function', () => {
    expect(typeof tools.timetotf).toBe('function');
  });

  test('timetotf2 is a function', () => {
    expect(typeof tools.timetotf2).toBe('function');
  });

  test('queue is a function', () => {
    expect(typeof tools.queue).toBe('function');
  });

  test('sleep is a function', () => {
    expect(typeof tools.sleep).toBe('function');
  });

});
