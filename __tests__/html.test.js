const { correctHTML } = require('../index');

describe('correctHTML', () => {

  test('returns plain text unchanged', () => {
    expect(correctHTML('hello world')).toBe('hello world');
  });

  test('preserves valid HTML tags', () => {
    expect(correctHTML('<b>bold</b>')).toBe('<b>bold</b>');
  });

  test('fixes &nbsp; to non-breaking space', () => {
    expect(correctHTML('a&nbsp;b')).toBe('a\u00A0b');
  });

  test('fixes &quot; to double quote', () => {
    expect(correctHTML('say &quot;hello&quot;')).toBe('say "hello"');
  });

  test('fixes &amp; to ampersand', () => {
    expect(correctHTML('rock &amp; roll')).toBe('rock & roll');
  });

  test('fixes &gt; to >', () => {
    expect(correctHTML('1 &gt; 0')).toBe('1 > 0');
  });

  test('fixes multiple entities in one string', () => {
    expect(correctHTML('&amp;&quot;&nbsp;&gt;')).toBe('&"\u00A0>');
  });

  test('auto-closes unclosed tags', () => {
    const result = correctHTML('<b>text');
    expect(result).toBe('<b>text</b>');
  });

  test('empty string returns empty string', () => {
    expect(correctHTML('')).toBe('');
  });

  test('auto-closes nested unclosed tags in correct order', () => {
    expect(correctHTML('Start and <b>bold and <i>italic and another <b>bold</b>'))
      .toBe('Start and <b>bold and <i>italic and another <b>bold</b></i></b>');
  });

});
