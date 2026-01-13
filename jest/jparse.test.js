const tools = require('../index');
const { jparse } = tools;

const obj = {
  user: {
    id: 1234,
    name: 'John Doe',
    email: 'john@example.com',
    active: true,
    role: 'admin'
  },
  config: {
    timeout: 5000,
    retries: 3,
    options: {
      debug: true,
      verbose: false
    }
  },
  items: [
    { id: 1, title: 'First' },
    { id: 2, title: 'Second' }
  ],
  template: '{"name": "{user.name}"}',
  path: 'user',
  nested: {
    ref: '{config}'
  }
};

describe('Empty and null sources', () => {

  test('undefined src', () => {
    expect(jparse(obj, undefined)).toEqual({});
    expect(jparse(obj, undefined, 'key')).toEqual({ key: null });
  });

  test('null src', () => {
    expect(jparse(obj, null)).toEqual({});
    expect(jparse(obj, null, 'key')).toEqual({ key: null });
  });

  test('empty string src', () => {
    expect(jparse(obj, '')).toEqual({});
    expect(jparse(obj, '', 'key')).toEqual({ key: null });
  });

});

describe('Object sources (already objects)', () => {

  // Note: when src is already an object, jparse calls replace() which stringifies it
  test('simple object returns stringified', () => {
    const src = { foo: 'bar' };
    expect(jparse(obj, src)).toEqual('{"foo":"bar"}');
  });

  test('object with placeholders returns stringified', () => {
    const src = { name: '{user.name}', id: '{user.id}' };
    expect(jparse(obj, src)).toEqual('{"name":"John Doe","id":"1234"}');
  });

  test('object with defaultkey returns stringified', () => {
    const src = { foo: 'bar' };
    expect(jparse(obj, src, 'status')).toEqual('{"foo":"bar","status":null}');
  });

  test('array returns stringified', () => {
    const src = [1, 2, 3];
    expect(jparse(obj, src)).toEqual('[1,2,3]');
  });

});

describe('Path references ({path} syntax)', () => {

  // Note: path references also return stringified objects
  test('simple path to object returns stringified', () => {
    const result = jparse(obj, '{user}');
    expect(result).toContain('"name":"John Doe"');
    expect(result).toContain('"id":1234');
  });

  test('nested path to object returns stringified', () => {
    const result = jparse(obj, '{config.options}');
    expect(result).toContain('"debug":true');
    expect(result).toContain('"verbose":false');
  });

  test('path to array returns stringified', () => {
    const result = jparse(obj, '{items}');
    expect(result).toContain('"title":"First"');
    expect(result).toContain('"title":"Second"');
  });

  test('path to non-object falls through to defaultkey', () => {
    // {user.name} points to a string, not an object
    expect(jparse(obj, '{user.name}', 'text')).toEqual({ text: 'John Doe' });
  });

  test('path to non-existent key', () => {
    expect(jparse(obj, '{nonexistent}', 'data')).toEqual({ data: '' });
  });

});

describe('JSON string parsing', () => {

  test('simple JSON object', () => {
    expect(jparse(obj, '{"foo": "bar"}')).toEqual({ foo: 'bar' });
  });

  test('JSON with placeholders', () => {
    expect(jparse(obj, '{"name": "{user.name}"}')).toEqual({ name: 'John Doe' });
  });

  test('JSON with multiple placeholders', () => {
    const src = '{"name": "{user.name}", "id": "{user.id}", "timeout": "{config.timeout}"}';
    expect(jparse(obj, src)).toEqual({
      name: 'John Doe',
      id: '1234',
      timeout: '5000'
    });
  });

  test('JSON with nested objects', () => {
    const src = '{"user": {"name": "{user.name}"}, "active": "{user.active}"}';
    expect(jparse(obj, src)).toEqual({
      user: { name: 'John Doe' },
      active: 'true'
    });
  });

  test('JSON with defaultkey', () => {
    const result = jparse(obj, '{"foo": "bar"}', 'status');
    expect(result).toEqual({ foo: 'bar', status: null });
  });

  test('JSON array of objects', () => {
    const src = '[{"name": "{user.name}"}, {"id": "{user.id}"}]';
    expect(jparse(obj, src)).toEqual([
      { name: 'John Doe' },
      { id: '1234' }
    ]);
  });

  test('JSON with whitespace', () => {
    const src = `{
      "name": "{user.name}",
      "role": "{user.role}"
    }`;
    expect(jparse(obj, src)).toEqual({
      name: 'John Doe',
      role: 'admin'
    });
  });

  test('JSON with newlines in values', () => {
    const context = { msg: 'line1\nline2\nline3' };
    const src = '{"text": "{msg}"}';
    const result = jparse(context, src);
    expect(result.text).toEqual('line1\nline2\nline3');
  });

  test('JSON with boolean values', () => {
    const src = '{"active": {user.active}, "name": "{user.name}"}';
    expect(jparse(obj, src)).toEqual({
      active: true,
      name: 'John Doe'
    });
  });

  test('JSON with number values', () => {
    const src = '{"id": {user.id}, "name": "{user.name}"}';
    expect(jparse(obj, src)).toEqual({
      id: 1234,
      name: 'John Doe'
    });
  });

});

describe('Plain string (fallback to defaultkey)', () => {

  test('plain string with defaultkey', () => {
    expect(jparse(obj, 'hello', 'message')).toEqual({ message: 'hello' });
  });

  test('plain string without defaultkey uses _notparsed', () => {
    expect(jparse(obj, 'hello')).toEqual({ _notparsed: 'hello' });
  });

  test('plain string with placeholder', () => {
    expect(jparse(obj, 'Hello {user.name}', 'greeting')).toEqual({
      greeting: 'Hello John Doe'
    });
  });

  test('defaultkey is null returns empty object', () => {
    expect(jparse(obj, 'hello', null)).toEqual({});
  });

  test('number as string', () => {
    expect(jparse(obj, '12345', 'code')).toEqual({ code: '12345' });
  });

  test('text with curly braces but not valid path', () => {
    // has space inside braces, so not a valid path
    expect(jparse(obj, '{invalid json}', 'data')).toEqual({ data: '{invalid json}' });
  });

});

describe('Suffix operations (.toLowerCase, .toUpperCase, .asKMB, .asNumber)', () => {

  test('toLowerCase in JSON', () => {
    const src = '{"name": "{user.name.toLowerCase}"}';
    expect(jparse(obj, src)).toEqual({ name: 'john doe' });
  });

  test('toUpperCase in JSON', () => {
    const src = '{"role": "{user.role.toUpperCase}"}';
    expect(jparse(obj, src)).toEqual({ role: 'ADMIN' });
  });

  test('asKMB in JSON', () => {
    const context = { views: 15000, likes: 1500000, comments: 500 };
    expect(jparse(context, '{"views": "{views.asKMB}"}')).toEqual({ views: '15K' });
    expect(jparse(context, '{"likes": "{likes.asKMB}"}')).toEqual({ likes: '1.5M' });
    expect(jparse(context, '{"comments": "{comments.asKMB}"}')).toEqual({ comments: '500' });
  });

  test('asNumber in JSON', () => {
    const context = { amount: 1234567 };
    expect(jparse(context, '{"amount": "{amount.asNumber}"}')).toEqual({ amount: '1,234,567' });
  });

  test('multiple suffixes in one JSON', () => {
    const context = { name: 'John Doe', views: 25000 };
    const src = '{"name": "{name.toLowerCase}", "views": "{views.asKMB}"}';
    expect(jparse(context, src)).toEqual({
      name: 'john doe',
      views: '25K'
    });
  });

  test('suffix with nested placeholder', () => {
    const context = {
      lang: 'en',
      titles: {
        en: 'Hello World',
        ru: 'Привет Мир'
      }
    };
    const src = '{"title": "{titles.{lang}.toUpperCase}"}';
    expect(jparse(context, src)).toEqual({ title: 'HELLO WORLD' });
  });

  test('suffix in plain string with defaultkey', () => {
    expect(jparse(obj, '{user.name.toLowerCase}', 'value')).toEqual({ value: 'john doe' });
    expect(jparse(obj, '{user.role.toUpperCase}', 'value')).toEqual({ value: 'ADMIN' });
  });

  test('asKMB with different magnitudes', () => {
    const context = {
      small: 999,
      thousand: 5500,
      million: 2300000,
      billion: 1200000000
    };
    expect(jparse(context, '{"v": "{small.asKMB}"}')).toEqual({ v: '999' });
    expect(jparse(context, '{"v": "{thousand.asKMB}"}')).toEqual({ v: '5.5K' });
    expect(jparse(context, '{"v": "{million.asKMB}"}')).toEqual({ v: '2.3M' });
    expect(jparse(context, '{"v": "{billion.asKMB}"}')).toEqual({ v: '1.2B' });
  });

});

describe('Replace options passthrough', () => {

  test('boolean options', () => {
    const src = '{"active": "{user.active}"}';
    const result = jparse(obj, src, null, { true: 'yes', false: 'no' });
    expect(result.active).toEqual('yes');
  });

  test('date formatting', () => {
    const context = { date: '2025-04-27T10:30:00.000Z' };
    const src = '{"created": "{date}"}';
    const result = jparse(context, src, null, { dateformat: 'DD/MM/YYYY' });
    expect(result.created).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('null replacement', () => {
    const context = { value: null };
    const src = '{"result": "{value}"}';
    const result = jparse(context, src, null, { null: 'N/A' });
    expect(result.result).toEqual('N/A');
  });

});

describe('Edge cases', () => {

  // Empty {} and [] don't match REGEX_JSON (requires key-value pair)
  test('empty object string falls through', () => {
    expect(jparse(obj, '{}')).toEqual({ _notparsed: '{}' });
  });

  test('empty array string falls through', () => {
    expect(jparse(obj, '[]')).toEqual({ _notparsed: '[]' });
  });

  test('deeply nested JSON', () => {
    const src = '{"a": {"b": {"c": "{user.name}"}}}';
    expect(jparse(obj, src)).toEqual({
      a: { b: { c: 'John Doe' } }
    });
  });

  test('JSON array with primitives', () => {
    const src = '[1, "two", true, null]';
    expect(jparse(obj, src)).toEqual([1, 'two', true, null]);
  });

  test('complex nested path in placeholder', () => {
    const context = {
      lang: 'en',
      messages: {
        en: { greeting: 'Hello' },
        ru: { greeting: 'Привет' }
      }
    };
    const src = '{"msg": "{messages.{lang}.greeting}"}';
    expect(jparse(context, src)).toEqual({ msg: 'Hello' });
  });

  test('JSON with special characters in values', () => {
    const context = { text: 'Hello "World"' };
    const src = '{"message": "{text}"}';
    const result = jparse(context, src);
    expect(result.message).toEqual('Hello "World"');
  });

});
