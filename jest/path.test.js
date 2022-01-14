const tools = require('../index');

const message = {
  text: 'some text here and 123 nums',
  chat: {
    id: 'chatID',
    title: 'chat_title'
  },
  user: {
    username: '@somename',
    id: 123
  }
};
const user = {
  id: 1234,
  age: 40,
  username: '@somename',
  fullname: 'Max',
  _lodash: 1,
  und: undefined,
  nul: null,
  true: true,
  false: false,
  empty: '',
  'ИНН': 'inn',
  codes: ['code1', 'code2', 'code3'],
  nums: [12, 14, 16, 18, 20]
};
const date = {
  day: 11,
  month: 3,
  year: 2021
};
const arr1 = ['a0', 'a1', 'a2'];
const arr2 = [{
  key: 'k0'
},
{
  key: 'k1'
}];
const obj = {
  msg: message,
  user,
  date,
  arr1,
  arr2,
  _key: 15
};


test('getSimpleData', () => {

  expect(tools.replace(obj, '_{user.id}!')).toEqual('_1234!');
  expect(tools.replace(obj, '_{user._lodash}_')).toEqual('_1_');
  expect(tools.replace(obj, '_{user.age}_')).toEqual('_40_');
  expect(tools.replace(obj, '_{user.ИНН}_')).toEqual('_inn_');

  // root
  expect(tools.replace(obj, '_{_key}_')).toEqual('_15_');

  // bool
  expect(tools.replace(obj, '_{user.true}_')).toEqual('_true_');
  expect(tools.replace(obj, '_{user.true}_', { true: '1' })).toEqual('_1_');

  expect(tools.replace(obj, '_{user.false}_')).toEqual('_false_');
  expect(tools.replace(obj, '_{user.false}_', { false: '0' })).toEqual('_0_');

  // other types
  expect(tools.replace(obj, '_{user.empty}_')).toEqual('__');
  expect(tools.replace(obj, '_{user.empty}_', { empty: 'no' })).toEqual('_no_');

  expect(tools.replace(obj, '_{user.und}_')).toEqual('__');
  expect(tools.replace(obj, '_{user.und}_', { undefined: '#' })).toEqual('_#_');

  expect(tools.replace(obj, '_{user.nul}_')).toEqual('_null_');
  expect(tools.replace(obj, '_{user.nul}_', { null: '*' })).toEqual('_*_');

  // not exists
  expect(tools.replace(obj, '_{user.notexists}_')).toEqual('__');
  expect(tools.replace(obj, '_{use1r.notexists}_')).toEqual('__');

});

test('arrays', () => {

  expect(tools.replace(obj, '_{user.codes[1]}_')).toEqual('_code2_');
  expect(tools.replace(obj, '_{arr2[0].key}_')).toEqual('_k0_');

  expect(tools.replace(obj, '_{user.nums}_')).toEqual('_[ 12, 14, 16, 18, 20 ]_');
  expect(tools.replace(obj, '_{user.nums}_', { array: ',' })).toEqual('_12,14,16,18,20_');
  expect(tools.replace(obj, '_{user.nums}_', { array: ', ' })).toEqual('_12, 14, 16, 18, 20_');

  expect(tools.replace(obj, '_{user.codes}_')).toEqual(`_[ 'code1', 'code2', 'code3' ]_`); // eslint-disable-line
  expect(tools.replace(obj, '_{user.codes}_', { array: ', ' })).toEqual('_code1, code2, code3_');

});

test('regex', () => {

  expect(tools.replace(obj, '{/@(.+)/user.username}')).toEqual('somename');
  expect(tools.replace(obj, 'n{/([0-9]+)/msg.text}')).toEqual('n123');
  expect(tools.replace(obj, '{/and ([0-9]+) num/msg.text}')).toEqual('123');
  // case sensitive?
  expect(tools.replace(obj, '{/And ([0-9]+) num/msg.text}')).toEqual('123');
  // null result of subregex
  expect(tools.replace(obj, '_{/and ([4-9]+) num/msg.text}!')).toEqual('_!');

});

test('complexStrings', () => {

  // separate strings
  expect(tools.replace(obj, '{user.fullname} {user.username}')).toEqual('Max @somename');

  // inside
  expect(tools.replace(obj, '_{user.nums[3]}_')).toEqual('_18_');
  expect(tools.replace(obj, '_{user.nums[{date.month}]}_')).toEqual('_18_');

  // question strings
  expect(tools.replace(obj, '_{?Name: {user.fullname}!}_')).toEqual('_Name: Max!_');
  expect(tools.replace(obj, '_{?Name: {user.full1name}!}_')).toEqual('__');
  expect(tools.replace(obj, '_{?n1: {smth.new}}_{?n2: {smth2.new2}}_')).toEqual('___');
});
