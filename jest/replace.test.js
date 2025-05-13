const tools = require('../index');
const { replace } = tools;

const dayjs = require('dayjs');

const now = dayjs();
const yesterday = now.subtract(1, 'day');
const tomorrow = now.add(1, 'day');
const lastWeek = now.subtract(7, 'days');
const nextMonth = now.add(1, 'month');

const obj = {
  _key: 15,
  user: {
    id: 1234,
    name: 'John Doe',
    firstname: 'John',
    lastname: 'Doe',
    username: 'john_doe',
    true: true,
    false: false,
    null: null,
    undef: undefined,
    empty: '',
    lang: 'en',
    ИНН: 'inn', // тест на кириллицу
    birthday: lastWeek.toISOString(),
    hobbies: ['chess', 'music', 'reading'],

  },
  sms: '{msg.text_{user.lang}}',
  products: {
    John: {
      expiration: nextMonth.toISOString(),
      views: 12500,
      min: 3016,
      title: 'MegaProduct',
      price: '$2',
    },
  },
  msg: {
    text_en: 'Your OTP is: 4750, do not send it anyone',
    hint: 'with $&gt; symbols',
    long: `this is
just a second
and a third lines`
  },
  date: {
    today: now.toISOString(),
    tomorrow: tomorrow.toISOString(),
    yesterday: yesterday.toISOString(),
    somedate: '2025-04-27',
    year: '2025',
    month: '04',
    day: '27'
  },
  posts: [{ id: 12 }],
  sizes: [12, 14, 16, 18, 20],
  errors: { js: 1 },
  stat: {
    '2025-04-27': {
      total: 55
    }
  }
};

describe('Get simple data (basic replacements)', () => {

  test('root keys', () => {
    expect(replace(obj, '_{_key}_')).toEqual('_15_');
  });

  test('simple data', () => {
    expect(replace(obj, '_{user.id}!')).toEqual('_1234!');
    expect(replace(obj, '_{user.name}!')).toEqual('_John Doe!');
    expect(replace(obj, '_{user.name}!')).toEqual('_John Doe!');

    expect(replace(obj, '_{products.John.price}_')).toEqual('_$2_');
    expect(replace(obj, '_{msg.hint}_')).toEqual('_with $&gt; symbols_');
  });

  test('multi-line', () => {
    expect(replace(obj, 'long: {/this (.+)/msg.long}')).toEqual(`long: is
just a second
and a third lines`);
    const res = replace(obj, `_{msg.long}_`, { crlf: '*' });
    expect(res).toEqual('_this is*just a second*and a third lines_');
  });


  test('cyrillic', () => {
    expect(replace(obj, '_{user.ИНН}_')).toEqual('_inn_');
  });

  test('multi-key', () => {
    expect(replace(obj, '_{_key}_{_key}_{_key}_')).toEqual('_15_15_15_');
  });

  test('random', () => {
    // random
    expect(replace(obj, '{rnd.9}')).toMatch(/^[0-9]$/);
    expect(replace(obj, '{rnd.09}')).toMatch(/^0[0-9]$/);
    expect(replace(obj, '{rnd.09}_{rnd.09}')).toMatch(/^0[0-9]_0[0-9]$/);
  });

  test('missing or undefined keys', () => {
    expect(replace(obj, '_{user.address}_')).toEqual('__');
    expect(replace(obj, '_{products.orange.status}_')).toEqual('__');
    expect(replace(obj, '_{products.{user.name}.refby.unknown_user}_')).toEqual('__');
    expect(replace(obj, '{?Missing email {user.email}}')).toEqual('');
    expect(replace(obj, '{?Promo code: {products.{user.name}.refby.{user.email}}}')).toEqual('');

    // important
    expect(replace(obj, '(?<sum>[0-9]{0,6})')).toEqual('(?<sum>[0-9]{0,6})');

    // other types
    expect(replace(obj, '_{user.empty}_')).toEqual('__');
    expect(replace(obj, '_{user.empty}_', { empty: 'no' })).toEqual('_no_');
  
    expect(replace(obj, '_{user.undef}_')).toEqual('__');
    expect(replace(obj, '_{user.undef}_', { undefined: '#' })).toEqual('_#_');
  
    expect(replace(obj, '_{user.null}_')).toEqual('__');
    expect(replace(obj, '_{user.null}_', { null: '*' })).toEqual('_*_');
  
    // not exists
    expect(replace(obj, '_{user.notexists}_')).toEqual('__');
    expect(replace(obj, '_{use1r.notexists}_')).toEqual('__');
  });

  test('errors', () => {
    expect(replace(obj, '')).toEqual('');
    expect(replace(obj, null)).toEqual('');
    expect(replace(obj, null, { null: 'n' })).toEqual('n');
    expect(replace(obj, undefined)).toEqual('');
    expect(replace(obj, undefined, { undefined: 'u' })).toEqual('u');
    expect(replace(obj, true)).toEqual('true');
    expect(replace(obj, false)).toEqual('false');
    expect(replace(obj, '123')).toEqual('123');
    expect(replace(obj, 555)).toEqual('555');
    expect(replace(obj, {})).toEqual('{}');
    expect(replace(obj, [])).toEqual('[]');

    expect(replace(0, 'a')).toEqual('a');
    expect(replace('', 'a')).toEqual('a');
    expect(replace(null, 'a')).toEqual('a');
    expect(replace(undefined, 'a')).toEqual('a');
    expect(replace(false, 'a')).toEqual('a');
    expect(replace({}, 'a')).toEqual('a');
    expect(replace([], 'a')).toEqual('a');

    expect(replace({}, 'a', null)).toEqual('a');
    expect(replace({}, 'a', 12)).toEqual('a');
    expect(replace({}, 'a', false)).toEqual('a');
    expect(replace({}, 'a', undefined)).toEqual('a');
  });


  test('arrays', () => {

    expect(replace(obj, '_{user.hobbies[1]}_')).toEqual('_music_');
    expect(replace(obj, '_{posts[0].id}_')).toEqual('_12_');
    expect(replace(obj, '_{sizes[0]}_')).toEqual('_12_');

    expect(replace(obj, '_{sizes}_')).toEqual('_[ 12, 14, 16, 18, 20 ]_');
    expect(replace(obj, '_{sizes}_', { array: ',' })).toEqual('_12,14,16,18,20_');
    expect(replace(obj, '_{sizes}_', { array: ', ' })).toEqual('_12, 14, 16, 18, 20_');

    expect(replace(obj, '_{user.hobbies}_')).toEqual(`_[ 'chess', 'music', 'reading' ]_`);
    expect(replace(obj, '_{user.hobbies}_', { array: ', ' })).toEqual('_chess, music, reading_');
  });

  test('objects', () => {
    expect(replace(obj, '_{errors}_')).toEqual('_{ js: 1 }_');
    expect(replace(obj, '_{/js: (.+) /errors}_')).toEqual('_1_');
  });

});

describe('Boolean replacement and logical negations (!, !!)', () => {

  test('get boolean', () => {
    expect(replace(obj, '_{user.true}_')).toEqual('_true_');
    expect(replace(obj, '_{user.true}_', { true: '1' })).toEqual('_1_');

    expect(replace(obj, '_{user.false}_')).toEqual('_false_');
    expect(replace(obj, '_{user.false}_', { false: '0' })).toEqual('_0_');
  });

  test('boolean ! & !!', () => {
    expect(replace(obj, '_{!user.username}_')).toEqual('_false_');
    expect(replace(obj, '_{!!user.username}_')).toEqual('_true_');

    expect(replace(obj, '_{!!msg}_')).toEqual('_true_');
    expect(replace(obj, '_{!!msg.text_en}_')).toEqual('_true_');
    expect(replace(obj, '_{!!msg.count}_')).toEqual('_false_');

    expect(replace(obj, '_{!user.null}_')).toEqual('_true_');
    expect(replace(obj, '_{!!user.null}_')).toEqual('_false_');
  });
});

describe('Suffix operations (toLowerCase, asKMB, length, asNumber)', () => {

  test('toLowerCase', () => {
    expect(replace(obj, '_{user.name.toLowerCase}_')).toEqual('_john doe_');
    expect(replace(obj, '_{products.John.title.toLowerCase}_')).toEqual('_megaproduct_');
    expect(replace(obj, '_{products.John.title.toUpperCase}_')).toEqual('_MEGAPRODUCT_');
    expect(replace(obj, '_{user.true.toUpperCase}_')).toEqual('_TRUE_');
    expect(replace(obj, '_{user.false.toUpperCase}_')).toEqual('_FALSE_');
    expect(replace(obj, '_{user.lang.toUpperCase}_')).toEqual('_EN_');
  });

  test('asKMB', () => {
    expect(replace(obj, '_{products.John.views.asKMB}_')).toEqual('_13K_');
    expect(replace(obj, '_{products.John.min.asKMB}_')).toEqual('_3K_');
  });

  test('length', () => {
    expect(replace(obj, '_{user.hobbies.length}_')).toEqual('_3_');
    expect(replace(obj, '_{products.John.title.length}_')).toEqual('_11_');
  });

  test('asNumber', () => {
    expect(replace(obj, '_{products.John.views}_')).toEqual('_12500_');
    expect(replace(obj, '_{products.John.views.asNumber}_')).toEqual('_12,500_');
  });
});

describe('complexStrings', () => {

  test('separate strings', () => {
    expect(replace(obj, '{user.firstname} {user.lastname}')).toEqual('John Doe');
  });

  test('JSON', () => {
    expect(replace(obj, '{ "date1": "{date.year}" }')).toEqual(`{ "date1": "2025" }`);

    expect(replace(obj, '{ "date2": "{date.year}-{date.month}" }')).toEqual(`{ "date2": "2025-04" }`);

    expect(replace(obj, '{ "sheet": "{products.John.title}", "date2": "{date.year}-{date.month}" }')).toEqual(`{ "sheet": "MegaProduct", "date2": "2025-04" }`);

    expect(replace(obj, '{ "sheet": "{products.{user.firstname}.title}", "date2": "{date.year}-{date.month}" }')).toEqual(`{ "sheet": "MegaProduct", "date2": "2025-04" }`);

    expect(replace(obj, '{ "good": {user.true} }')).toEqual(`{ "good": true }`);
  });
  
  test('question strings', () => {
    expect(replace(obj, '_{?name: {user.firstname}!}_')).toEqual('_name: John!_');
    expect(replace(obj, '_{?Name: {user.first_name}!}_')).toEqual('__');

    // both
    expect(replace(obj, '_{?name: {user.firstname} {user.lastname}}_')).toEqual('_name: John Doe_');
    // one
    expect(replace(obj, '_{?name: {user.first_name} {user.lastname}}_')).toEqual('__');
    // none
    expect(replace(obj, '_{?name: {user.first_name} {user.last_name}}_')).toEqual('__');

    expect(replace(obj, '_{?n1: {user.firstname}},{?n2: {user.lastname}}_')).toEqual('_n1: John,n2: Doe_');

    // inside
    expect(replace(obj, '_{?Title: {products.{user.firstname}.title}}_')).toEqual('_Title: MegaProduct_');
  });
    
  // question with bool
  test('question with bool', () => {
    expect(replace(obj, '_{?name: {!!user.name}}_')).toEqual('_name: true_');
    expect(replace(obj, '_{?name: {!user.name}}_')).toEqual('_name: false_');
    expect(replace(obj, '_{?name: {!!user.doesntexists}}_')).toEqual('_name: false_');
  });
});

describe('Sub-regexes', () => {
  
  test('subregex', () => {

    expect(replace(obj, '{/([0-9]+)/msg.text_{user.lang}}')).toEqual('4750');
    expect(replace(obj, 'n{/([0-9]+)/msg.text_en}')).toEqual('n4750');

    expect(replace(obj, '{/is: (.+),/msg.text_en}')).toEqual('4750');
    // case sensitive?
    expect(replace(obj, '{/IS: (.+),/msg.text_en}')).toEqual('4750');
    // null result of subregex
    expect(replace(obj, '^{/null: (.+),/msg.text_en}$')).toEqual('^$');

  });
});

// console.log(testObj);

describe('Deep (nested) replacement', () => {

  test('nested replacement', () => {
    expect(replace(obj, 'SMS: {sms}')).toEqual('SMS: Your OTP is: 4750, do not send it anyone');
  });

  test('nested with date', () => {
    expect(replace(obj, '_{date.somedate}_')).toEqual('_2025-04-27_');
    expect(replace(obj, '_{date.somedate}_', { date: false })).toEqual('_2025-04-27_');
    expect(replace(obj, '_{stat.{date.somedate}.total}_')).toEqual('_55_');
  });

});

describe('Date formatting and date operations', () => {

  test('date formatting', () => {

    expect(replace(obj, '_{date.today}_')).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    expect(replace(obj, '_{user.birthday}_')).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

    // default format
    expect(replace(obj, '_{date.today}_')).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);

    // custom format
    const text = replace(obj, '_{date.today}_', { dateformat: 'DD/MM/YYYY' });
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('date after & before', () => {

    const days = parseInt(replace(obj, '_{user.birthday.after.days}_').match(/\d+/)[0], 10);
    expect(days).toBeGreaterThanOrEqual(7);
    expect(days).toBeLessThanOrEqual(8);

    const months = parseInt(replace(obj, '_{products.{user.firstname}.expiration.before.months}_').match(/\d+/)[0], 10);
    expect(months).toBeGreaterThanOrEqual(0);
    expect(months).toBeLessThanOrEqual(2);

    const hoursAfterToday = parseInt(replace(obj, '_{date.today.after.hours}_').match(/\d+/)[0], 10);
    expect(hoursAfterToday).toBeGreaterThanOrEqual(0);
    expect(hoursAfterToday).toBeLessThanOrEqual(24);

    const hoursBeforeTomorrow = parseInt(replace(obj, '_{date.tomorrow.before.hours}_').match(/\d+/)[0], 10);
    expect(hoursBeforeTomorrow).toBeGreaterThanOrEqual(0);
    expect(hoursBeforeTomorrow).toBeLessThanOrEqual(24);
  });
});

