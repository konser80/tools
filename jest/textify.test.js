const tools = require('../index');


test('textify', () => {

  expect(tools.textify(undefined)).toEqual('undefined');
  expect(tools.textify(null)).toEqual('null');
  expect(tools.textify(false)).toEqual('false');
  expect(tools.textify(true)).toEqual('true');

  expect(tools.textify(12)).toEqual('12');
  expect(tools.textify('abc')).toEqual('abc');

  // objects
  const d1 = new Date('2022-04-05T06:07:08');
  expect(tools.textify(d1)).toEqual('2022-04-05 06:07:08.000');
  expect(tools.textify({ id: 'abc' })).toEqual("{ id: 'abc' }");
  expect(tools.textify(['a', 'b'])).toEqual("[ 'a', 'b' ]");

  // limit
  expect(tools.textify('This is a long string', { limit: 4 })).toEqual('This...');

});
