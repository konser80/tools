const dayjs = require('dayjs');

// ==============================================
function timeframeToUnixTime(s) {
  if (!s) return 0;
  if (typeof s !== 'string') return s;

  // 15s, 10m, 24h, 7d
  // convert strings to unix time

  const int = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;

  let tf = 'hour';
  if (s.indexOf('s') !== -1) tf = 'second';
  if (s.indexOf('m') !== -1) tf = 'minute';
  if (s.indexOf('h') !== -1) tf = 'hour';
  if (s.indexOf('d') !== -1) tf = 'day'; // float doesn't work on days

  const time = dayjs(0).add(int, tf).valueOf();
  return time;
}

module.exports = timeframeToUnixTime;
