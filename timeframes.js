const dayjs = require('dayjs');

const SEC = 1000;
const MIN = 60*SEC;
const HOUR = 60*MIN;
const DAY = 24*HOUR;
const YEAR = 365.25*DAY;

const REGEX_TF = /(\d+(\.\d+)?[smhdwMy])/g;

// ==============================================
// convert strings to unix time
// 15s, 10m, 24h, 7d, 1y, 1.750s & strings like: 2h3m10s
function timeframeToUnixTime(s, fromDate = dayjs()) {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  if (typeof s !== 'string') return 0;

  REGEX_TF.lastIndex = 0;
  let reg;
  let val = 0;
  while ((reg = REGEX_TF.exec(s)) !== null) {
    val += decodeTimeframe(reg[1], fromDate);
  }

  return val;
}
// ==============================================
function decodeTimeframe(string, fromDate) {
  const value = parseFloat(string.replace(/[^0-9.]/g, '')) || 0;

  if (string.indexOf('s') !== -1) return value * SEC;
  else if (string.indexOf('m') !== -1) return value * MIN;
  else if (string.indexOf('h') !== -1) return value * HOUR;
  else if (string.indexOf('d') !== -1) return value * DAY;
  else if (string.indexOf('w') !== -1) {
    const now = dayjs(fromDate);
    return now.add(value, 'week').valueOf() - now.valueOf();
  }
  else if (string.indexOf('M') !== -1) {
    const now = dayjs(fromDate);
    return now.add(value, 'month').valueOf() - now.valueOf();
  }
  else if (string.indexOf('y') !== -1) {
    const now = dayjs(fromDate);
    return now.add(value, 'year').valueOf() - now.valueOf();
  }

  return value * HOUR; // default
}

// ==============================================
function timetoTimeFrame(diff) {

  if (diff < SEC) return `${diff}ms`;
  if (diff < MIN) return `${(diff / SEC).toFixed(1)}s`;
  if (diff < HOUR) return `${(diff / MIN).toFixed(1)}m`;
  if (diff < 4*DAY) return `${(diff / HOUR).toFixed(1)}h`;
  return `${(diff / DAY).toFixed(1)}d`;
}
// ==============================================
// units: how many non-empty units to keep, 0 or Infinity = all of them
function timetoTimeFrame2(diff, units = 2) {

  let parts = [];
  let remaining = diff;

  ({ parts, remaining } = calcTimeDiff(YEAR, 'y', remaining, parts));
  ({ parts, remaining } = calcTimeDiff(DAY, 'd', remaining, parts));
  ({ parts, remaining } = calcTimeDiff(HOUR, 'h', remaining, parts));
  ({ parts, remaining } = calcTimeDiff(MIN, 'm', remaining, parts));
  ({ parts, remaining } = calcTimeDiff(SEC, 's', remaining, parts));
  if (!parts.length) ({ parts } = calcTimeDiff(1, 'ms', remaining, parts));
  if (!parts.length) return '0ms';

  const limit = (units > 0) ? units : parts.length;
  return parts.slice(0, limit).join('');
}
// ==============================================
function calcTimeDiff(unit, suffix, remaining, parts) {
  const count = Math.floor(remaining / unit);
  return {
    parts: count > 0 ? [...parts, `${count}${suffix}`] : parts,
    remaining: remaining - count * unit,
  };
}


module.exports.tftotime = timeframeToUnixTime;
module.exports.timetotf = timetoTimeFrame;
module.exports.timetotf2 = timetoTimeFrame2;
