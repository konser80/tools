// ==============================================
function val(x, def) {
  if (x === undefined || x === null) return def ?? x;
  
  if (typeof x !== 'string') return x;
  
  const trimmed = x.trim();
  const len = trimmed.length;
  if (len === 0) return '';
  
  // phone numbers: starting with '+'
  const cc0 = trimmed.charCodeAt(0);
  if (cc0 === 43) return trimmed;

  // вызываем toLowerCase только когда первый символ — буква
  const isAlpha = (cc0 >= 65 && cc0 <= 90) || (cc0 >= 97 && cc0 <= 122);
  if (isAlpha) {
    const lower = trimmed.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'null') return null;
  }

  // numbers (hex, binary, oct) like 0x34a8, 0o123, 0b1101
  if ((cc0 === 48 && // starts with '0'
    (trimmed[1] === 'x'
    || trimmed[1] === 'X'
    || trimmed[1] === 'o'
    || trimmed[1] === 'O'
    || trimmed[1] === 'b'
    || trimmed[1] === 'B'))
  ) return trimmed;

  // exp like 1e12, 12e8
  if (trimmed.indexOf('e') !== -1 || trimmed.indexOf('E') !== -1) return trimmed;
  
  // dot at the end '.'
  if (trimmed.charCodeAt(len -1) === 46) return trimmed;

  // быстрый фильтр: если первый символ не цифра, не минус и не точка — не парсим
  const isDigit = cc0 >= 48 && cc0 <= 57;
  if (!(isDigit || cc0 === 45 || cc0 === 46)) return trimmed;

  // now it's time to parse numbers/float
  const num = Number(trimmed);
  if (Number.isFinite(num)) return num;
  if (num === Infinity || num === -Infinity) return trimmed;
  
  return trimmed;
}

module.exports = val;
