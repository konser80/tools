const dayjs = require('dayjs');

const SEC = 1000;
const MIN = 60*SEC;
const HOUR = 60*MIN;
const DAY = 24*HOUR;
const YEAR = 365.25*DAY;

const REGEX_TF = /(\d+(.\d+)?[smhdwM])/g;
// const REGEX_TF = /([\d.]{1,3}[smhdwM])/g;

// ==============================================
function timeframeToUnixTime(s) {
  if (!s) return 0;
  if (typeof s !== 'string') return s;

  // 15s, 10m, 24h, 7d, 1.750s
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
  if (string.indexOf('M') !== -1) tf = 'month'; // float doesn't work on months

  const time = dayjs(0).add(int, tf).valueOf();
  return time;
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
function timetoTimeFrame2(_diff) {

  let res = '';
  let diff = _diff;

  ({ res, diff } = calcTimeDiff(YEAR, 'y', diff, res));
  ({ res, diff } = calcTimeDiff(DAY, 'd', diff, res));
  ({ res, diff } = calcTimeDiff(HOUR, 'h', diff, res));
  ({ res, diff } = calcTimeDiff(MIN, 'm', diff, res));
  ({ res, diff } = calcTimeDiff(SEC, 's', diff, res));
  if (res === '') ({ res, diff } = calcTimeDiff(1, 'ms', diff, res));
  if (res === '') res = '0ms';
  return res;
}
// ==============================================
function calcTimeDiff(tf, char, diff, string) {
  const res = { res: string };

  const num = Math.floor(diff / tf);
  res.diff = diff - num * tf;
  if (num > 0) res.res = `${string}${num}${char}`;
  return res;
}


module.exports.tftotime = timeframeToUnixTime;
module.exports.timetotf = timetoTimeFrame;
module.exports.timetotf2 = timetoTimeFrame2;
