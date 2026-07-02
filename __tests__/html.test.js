const { correctHTML } = require('../index');

describe('correctHTML (sanitize-html impl)', () => {

  test('returns plain text unchanged', () => {
    expect(correctHTML('hello world')).toBe('hello world');
  });

  test('empty string returns empty string', () => {
    expect(correctHTML('')).toBe('');
  });

  test('preserves allowed tag', () => {
    expect(correctHTML('<b>bold</b>')).toBe('<b>bold</b>');
  });

  test('lowercases allowed tag with uppercase name', () => {
    expect(correctHTML('<B>x</B>')).toBe('<b>x</b>');
  });

  test('escapes unknown tag and keeps original text and case', () => {
    expect(correctHTML('text from <Mr Robot> user'))
      .toBe('text from &lt;Mr Robot&gt; user');
  });

  test('escapes unknown standalone tag', () => {
    expect(correctHTML('<Mr Robot>')).toBe('&lt;Mr Robot&gt;');
  });

  test('escapes disallowed tag like div', () => {
    expect(correctHTML('<div>wrap</div>')).toBe('&lt;div&gt;wrap&lt;/div&gt;');
  });

  test('escapes script tag', () => {
    expect(correctHTML('<script>evil()</script>hi'))
      .toBe('&lt;script&gt;evil()&lt;/script&gt;hi');
  });

  test('preserves anchor with safe href', () => {
    expect(correctHTML('<a href="https://x.com">link</a>'))
      .toBe('<a href="https://x.com">link</a>');
  });

  test('preserves tg:// mention href', () => {
    expect(correctHTML('mention <a href="tg://user?id=112233">userfullname</a>'))
      .toBe('mention <a href="tg://user?id=112233">userfullname</a>');
  });

  test('strips javascript: scheme from anchor', () => {
    expect(correctHTML('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  test('escapes bare < and > used as math operators', () => {
    expect(correctHTML('1 < 2 and 3 > 2')).toBe('1 &lt; 2 and 3 &gt; 2');
  });

  test('encodes bare ampersand', () => {
    expect(correctHTML('rock & roll')).toBe('rock &amp; roll');
  });

  test('collapses &nbsp; to non-breaking space', () => {
    expect(correctHTML('a&nbsp;b')).toBe('a b');
  });

  test('auto-closes unclosed allowed tag', () => {
    expect(correctHTML('<b>text')).toBe('<b>text</b>');
  });

  test('fixes nesting order of allowed tags', () => {
    expect(correctHTML('<b>bold and <i>italic</b></i>'))
      .toBe('<b>bold and <i>italic</i></b>');
  });

  test('preserves <span class="tg-spoiler">', () => {
    expect(correctHTML('<span class="tg-spoiler">hidden</span>'))
      .toBe('<span class="tg-spoiler">hidden</span>');
  });

  test('unwraps <span> without tg-spoiler class', () => {
    expect(correctHTML('<span>plain</span>')).toBe('plain');
  });

  test('unwraps <span class="other"> keeping its text', () => {
    expect(correctHTML('<span class="other">x</span>')).toBe('x');
  });

  test('keeps tg-spoiler span inside other allowed tags', () => {
    expect(correctHTML('<b>before <span class="tg-spoiler">hidden</span> after</b>'))
      .toBe('<b>before <span class="tg-spoiler">hidden</span> after</b>');
  });

  test('respects custom allowedTags option', () => {
    expect(correctHTML('<b>x</b><i>y</i>', { allowedTags: ['b'] }))
      .toBe('<b>x</b>&lt;i&gt;y&lt;/i&gt;');
  });

});
