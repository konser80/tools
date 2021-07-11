const dayjs = require('dayjs');

const REGEX_TF = /([\d.]{1,3}[smhdw])/g;

// ==============================================
function timeframeToUnixTime(s) {
  if (!s) return 0;
  if (typeof s !== 'string') return s;

  // 15s, 10m, 24h, 7d
  // convert strings to unix time
  // & strings like: 2h3m10s

  let reg;
  let val = 0;
  while ((reg = REGEX_TF.exec(s)) !== null) {
    val += decodeTimeframe(reg[1]);
  }

  return val;
}

// ==============================================
function decodeTimeframe(string) {

  const int = parseFloat(string.replace(/[^0-9.]/g, '')) || 0;

  let tf = 'hour'; // we need some default
  if (string.indexOf('s') !== -1) tf = 'second';
  if (string.indexOf('m') !== -1) tf = 'minute';
  if (string.indexOf('h') !== -1) tf = 'hour';
  if (string.indexOf('d') !== -1) tf = 'day'; // float doesn't work on days
  if (string.indexOf('w') !== -1) tf = 'week'; // float doesn't work on weeks

  const time = dayjs(0).add(int, tf).valueOf();
  return time;
}

module.exports = timeframeToUnixTime;
