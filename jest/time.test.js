const tools = require('../index');

test('tftotime', () => {

  // simple
  expect(tools.tftotime('1s')).toEqual(1000);
  expect(tools.tftotime('1m')).toEqual(60000);
  expect(tools.tftotime('1h')).toEqual(3600000);
  expect(tools.tftotime('1d')).toEqual(86400000);
  expect(tools.tftotime('1w')).toEqual(604800000);

  // complex
  expect(tools.tftotime('1m10s')).toEqual(70000);
  expect(tools.tftotime('1m 10s')).toEqual(70000);
  expect(tools.tftotime('1h2m')).toEqual(3720000);
  expect(tools.tftotime('1h2m5s')).toEqual(3725000);

  // other
  expect(tools.tftotime('1q')).toEqual(0);
  expect(tools.tftotime('1')).toEqual(0);
  expect(tools.tftotime('w')).toEqual(0);

  expect(tools.tftotime('@days.dk')).toEqual(0);
});

test('timetotf', () => {

  // simple
  expect(tools.timetotf('100')).toEqual('100ms');
  expect(tools.timetotf('1000')).toEqual('1.0s');
  expect(tools.timetotf('1200')).toEqual('1.2s');
  expect(tools.timetotf('11700')).toEqual('11.7s');

});

test('timetotf2', () => {

  // simple
  expect(tools.timetotf2('0')).toEqual('0ms');
  expect(tools.timetotf2('100')).toEqual('100ms');
  expect(tools.timetotf2('1000')).toEqual('1s');
  expect(tools.timetotf2('11000')).toEqual('11s');
  expect(tools.timetotf2('60000')).toEqual('1m');
  expect(tools.timetotf2('61000')).toEqual('1m1s');
  expect(tools.timetotf2('3600000')).toEqual('1h');
  expect(tools.timetotf2('4200000')).toEqual('1h10m');
});
