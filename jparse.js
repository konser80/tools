const log = require('./index').logger();

// ==============================================
// extended JSON.parse
function jparse(src) {
  let res = {};

  if (!src) return res;
  if (typeof src !== 'string') return res;

  try {
    res = JSON.parse(src);
  }
  catch (e) {
    log.error(`[-] json.parse: ${e.message}`, { err: e });

    const errText = highlightParseError(e, src);
    if (errText) log.info(errText);
    log.trace(src);
    return false;
  }
  return res;
}
// ==============================================
function highlightParseError(e, string) {
  const REGEX = /in JSON at position (\d+)/;
  const regexResult = e.message.match(REGEX);
  if (!regexResult) return '';

  const pos = parseInt(regexResult[1]);

  const start = (pos <= 20) ? 0 : pos -20;
  const end = (pos +20 > string.length) ? string.length : pos +20;

  const res = `${string.slice(start, pos).grey}${string.slice(pos, pos+1).white.bgRed}${string.slice(pos+1, end).grey}`
    .replace(/\n/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  log.info(res);
}

module.exports.parse = jparse;
