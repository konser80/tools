const _ = require('lodash');
const dayjs = require('dayjs');
dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
const tools = require('./index');

const REGEX_PLACEHOLDER = /\{(?<bool>!{1,2})?(?<sub>\/.*?\/)?(?<path>[a-zа-я_][a-zа-я0-9:_\-.[\]]*?)\}/i;

const REGEX_RND = /^rnd\.(\d+)$/;
const REGEX_ASNUMBER = /^(?<path>.+)\.asNumber$/;
const REGEX_ASKMB = /^(?<path>.+)\.asKMB$/;
const REGEX_LOWERCASE = /^(?<path>.+)\.toLowerCase$/;
const REGEX_UPPERCASE = /^(?<path>.+)\.toUpperCase$/;
const REGEX_GROUP = /\[([^[]+?\|[^[]+?)\]/;

const REGEX_DATES = /^(?<path>.+)\.(?<ab>after|before)\.(?<tf>seconds?|minutes?|hours?|days?|weeks?|months?|years?|timeframes?|spell\.?(?<lang>en|ru)?)$/;
const REGEX_DIGITS = /^(\d+)$/;
const REGEX_TZ = /(\+\d{2}:\d{2}|Z)$/;

const DEBUG = false;

// ==============================================
function processText(obj, text, params) {
  if (DEBUG) console.log(`processText: "${text}"`.yellow.bold);

  if (text == null
    || text === ''
    || typeof text === 'boolean') return text;

  let result = text;
  const opt = getDefaultParams(params);

  // Шаг 1: обрабатываем все сложные (условные) блоки
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const block = findDeepestConditional(result);
    if (!block) break;

    const processed = processConditionalBlock(obj, block, opt);
    result = result.replace(block, processed);
  }

  // Шаг 2: обрабатываем все простые плейсхолдеры
  if (DEBUG) console.debug(`...processing placeholders`);
  const { text: replacedText } = processPlaceholders(obj, result, opt);
  result = replacedText;
  
  // Обрабатываем random группы
  result = applyRandomReplace(result, opt);

  return result;
}


// ==============================================
// ищем самый глубокий вопросительный блок {? ... }
// так как они могут быть со вложенностями
function findDeepestConditional(text) {
  if (DEBUG) console.log(`findDeepestConditional()`);

  const stack = [];
  let deepest = null;
  let deepestDepth = -1;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') {
      stack.push(i);
    }
    else if (text[i] === '}') {
      const start = stack.pop();
      if (start !== undefined && text[start + 1] === '?') {
        if (stack.length > deepestDepth) {
          deepestDepth = stack.length;
          deepest = { start, end: i };
        }
      }
    }
  }

  if (!deepest) {
    if (DEBUG) console.debug(`...not found`);
    return null;
  }
  const res = text.slice(deepest.start, deepest.end + 1);

  if (DEBUG) console.debug(`=> "${res}"`);
  return res;
}

// ==============================================
// заменяет целиком {? ... } блок
function processConditionalBlock(obj, block, opt) {
  if (DEBUG) console.log(`processConditionalBlock() "${block}"`);

  const payload = block.slice(2, -1); // убираем {? и };
  const { text, failed } = processPlaceholders(obj, payload, opt);
  // const { text, replaced } = processPlaceholders(obj, payload, opt);

  const res = failed ? '' : text;
  // const res = replaced ? text : '';
  return res;
}


// ==============================================
function processPlaceholders(obj, text, opt, depth = 0) {
  if (DEBUG) console.log(`processPlaceholders(depth = ${depth}) "${text}"`);

  if (!text.includes('{')) {
    if (DEBUG) console.debug(`=> nothing to do`);
    return { text, replaced: false };
  }

  let result = '';
  let cursor = 0;
  let anyReplacement = false;
  let anyFailure = false;

  while (cursor < text.length) {
    const match = findNextPlaceholder(text, cursor);
    if (!match) {
      result += text.slice(cursor);
      break;
    }
    
    result += text.slice(cursor, match.start);

    const rawPlaceholder = match.placeholder.slice(1, -1); // убираем внешние скобки

    // eslint-disable-next-line no-unused-vars
    const { text: resolvedPath, replaced: replacedInside } = processPlaceholders(obj, rawPlaceholder, opt, depth + 1);

    const isTopLevel = (depth === 0);
    if (DEBUG) console.debug(`...returned to depth = ${depth}`);
    const value = replacer(obj, `{${resolvedPath}}`, opt, isTopLevel);
    
    // TODO: check ''
    if (value !== undefined && value !== null && value !== '') {
      anyReplacement = true;
    }
    if (value === undefined || value === null || value === '') {
      anyFailure = true;
    }

    // мы могли вернуть новый текст тоже с плейсхолдерами
    const { text: processedValue, replaced: replacedInsideAgain, failed: failedInsideAgain } = processPlaceholders(obj, value, opt, depth);
    if (replacedInsideAgain) anyReplacement = true;
    if (failedInsideAgain) anyFailure = true;

    result += processedValue ?? '';
    cursor = match.end;
  }

  if (DEBUG) console.log(`=> ${result}`.cyan);
  return { text: result, replaced: anyReplacement, failed: anyFailure };
}

// ==============================================
// ищет посимвольно плейсхолдер со вложенностями
// Как только встречаем {, увеличиваем depth, Когда встречаем }, уменьшаем depth, Если depth снова стал 0 — значит мы нашли правильную пару
function findNextPlaceholder(text, from = 0) {
  if (DEBUG) console.log(`findNextPlaceholder() "${text}"`);

  let start = -1;
  let depth = 0;

  for (let i = from; i < text.length; i += 1) {
    const char = text[i];

    if (char === '{') {
      if (depth === 0) {
        start = i; // нашли открытие плейсхолдера
      }
      depth += 1;
    }
    else if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          // нашли полное закрытие
          const placeholder = text.slice(start, i + 1);
          if (DEBUG) console.debug(`=> "${placeholder}"`);
          return { placeholder, start, end: i + 1 };
        }
      }
    }
  }

  if (DEBUG) console.debug(`=> nothing`);
  return null; // ничего не нашли
}


// ==============================================
// выделяет возможные суффиксы !! и //
function replacer(obj, rawKey, opt, isTopLevel) {
  if (DEBUG) console.log(`replacer(isTopLevel: ${isTopLevel}) "${rawKey}"`.cyan);

  const match = rawKey.trim().match(REGEX_PLACEHOLDER);
  if (!match || !match.groups?.path) {
    if (DEBUG) console.debug(`=> ""`);
    return '';
  }

  if (DEBUG) console.debug(match);

  // get main value
  const _opt = isTopLevel ? opt : {};
  let value = resolveValue(obj, match.groups.path.trim(), _opt);

  // apply prefixes
  value = applySubRegex(match.groups.sub, value);
  value = applyBoolean(match.groups.bool, value, opt);

  return value;
}

// ==============================================
function applySubRegex(sub, value) {
  if (!sub) return value;

  if (DEBUG) console.log(`applySubRegex() "${sub}"`);

  if (sub && typeof value === 'string') {
    try {
      const regex = new RegExp(sub.slice(1, -1), 'i');
      const found = value.match(regex);
      value = (found && found[1] !== undefined) ? found[1] : '';
    }
    catch (e) {
      value = '';
    }
  }

  if (DEBUG) console.debug(`=> "${value}"`);
  return value;
}
// ==============================================
function applyBoolean(bool, value, opt) {
  
  if (bool === '!!') {
    if (DEBUG) console.log(`applyBoolean() "${bool}"`);
    value = (value) ? opt.true : opt.false;
    if (DEBUG) console.debug(`=> "${value}"`);
  }
  else if (bool === '!') {
    if (DEBUG) console.log(`applyBoolean() "${bool}"`);
    value = (!value) ? opt.true : opt.false;
    if (DEBUG) console.debug(`=> "${value}"`);
  }
  return value;
}

// ==============================================
function resolveValue(obj, rawPath, opt) {
  if (DEBUG) console.log(`resolveValue() "${rawPath}"`);

  const path = rawPath.trim();
  let value = getValueByPath(obj, path, opt);

  value = sfxDates(obj, path, value, opt);

  value = sfxAsNumber(obj, path, value, opt);
  value = sfxAsKMB(obj, path, value, opt);

  value = sfxLowerCase(obj, path, value, opt);
  value = sfxUpperCase(obj, path, value, opt);

  if (value === undefined || value === null) return '';
  value = String(value);

  if (DEBUG) console.debug(`=> "${value}"`);
  return value;
}

// ==============================================
// достает объект из пути, либо применяя рандомный фильтр
function getValueByPath(obj, path, opt) {
  if (DEBUG) console.log(`getValueByPath() "${path}"`);

  const rnd = getRandomNumber(path);
  if (rnd !== null) return rnd;

  let value = _.get(obj, path);
  if (DEBUG) console.debug(`...got ${typeof value} "${tools.textify(value)}"`);

  if (Array.isArray(value) && opt.array && typeof value[0] !== 'object') {
    value = value.filter(Boolean).join(opt.array);
  }
  else if (value === undefined) {
    value = opt.undefined;
  }
  else if (value === null) {
    value = opt.null;
  }
  else if (value === '') {
    value = opt.empty;
  }
  else if (value === true) {
    value = opt.true;
  }
  else if (value === false) {
    value = opt.false;
  }
  if (typeof value === 'object') {
    value = tools.textify(value);
  }
  

  // in case of numbers and smth else
  value = String(value);

  // crlf
  if (opt.crlf !== undefined) {
    value = value.replace(/\n/g, opt.crlf);
  }

  value = processEscape(value, opt);
  value = processDateFormat(value, opt);

  // fix $& behavior
  if (value.includes('$')) {
    value = value.replace(/\$/g, '$$');
  }
  
  if (DEBUG) console.debug(`...return ${typeof value} "${tools.textify(value)}"`);
  return value;
}
// ==============================================
function processDateFormat(value, opt) {
  if (isDateTime(value) && opt.date) {
    try {
      value = (opt.tz)
        ? dayjs(value).tz(opt.tz).format(opt.dateformat)
        : dayjs(value).format(opt.dateformat);
    }
    catch (e) {
      value = dayjs(value).tz().format('YYYY-MM-DD HH:mm:ss');
    }
  }
  return value;
}
// ==============================================
function processEscape(value, opt) {
  if (typeof opt.escape !== 'string') return value;

  return value
    .split('')
    .map((char) => (opt.escape.includes(char) ? `\\${char}` : char))
    .join('');
}

// ==============================================
// {rnd.9} -> 5, {rnd.09} -> 05
function getRandomNumber(path) {
  const match = path.match(REGEX_RND);
  if (!match) return null;

  if (DEBUG) console.log(`getRandomNumber() ${path}`);

  const snumber = match[1];
  const inumber = parseInt(snumber, 10) || 0;

  const rnd = Math.round(Math.random() * inumber);
  const srnd = rnd.toString().padStart(snumber.length, '0');

  if (DEBUG) console.debug(`=> ${srnd}`);
  return srnd;
}

// ==============================================
// 1024 -> 1,024
function sfxAsNumber(obj, fullpath, value) {
  const match = fullpath.match(REGEX_ASNUMBER);
  if (!match?.groups?.path) return value;

  const myValue = getValueByPath(obj, match.groups.path, {});
  if (myValue == null) return '';
  
  const num = Number(myValue);
  if (Number.isNaN(num)) return '';
  
  const res = num.toLocaleString('en-US');
  if (DEBUG) console.log(`sfxAsNumber() => ${res}`);
  return res;
}
// ==============================================
// 1224 -> 1.2K, 15000 -> 15K
function sfxAsKMB(obj, fullpath, value) {
  const match = fullpath.match(REGEX_ASKMB);
  if (!match?.groups?.path) return value;

  const myValue = getValueByPath(obj, match.groups.path, {});
  if (myValue == null) return '';

  const num = Number(myValue);
  if (Number.isNaN(num)) return '';

  let formatted;
  let res;
  if (Math.abs(num) >= 1_000_000_000) {
    formatted = num / 1_000_000_000;
    const fixed = formatted < 10 ? formatted.toFixed(1) : Math.round(formatted);
    res = `${fixed}B`;
  }
  else if (Math.abs(num) >= 1_000_000) {
    formatted = num / 1_000_000;
    const fixed = formatted < 10 ? formatted.toFixed(1) : Math.round(formatted);
    res = `${fixed}M`;
  }
  else if (Math.abs(num) >= 1_000) {
    formatted = num / 1_000;
    const fixed = formatted < 10 ? formatted.toFixed(1) : Math.round(formatted);
    res = `${fixed}K`;
  }
  else {
    res = String(Math.round(num));
  }

  if (DEBUG) console.log(`sfxAsKMB() => ${res}`);
  return res;
}
// ==============================================
function sfxLowerCase(obj, fullpath, value, opt) {
  const match = fullpath.match(REGEX_LOWERCASE);
  if (!match?.groups?.path) return value;

  const myValue = getValueByPath(obj, match.groups.path, { tz: opt.tz });
  if (myValue == null) return '';
  
  const res = String(myValue).toLowerCase();
  if (DEBUG) console.log(`sfxLowerCase() => ${res}`);
  return res;
}
// ==============================================
function sfxUpperCase(obj, fullpath, value, opt) {
  const match = fullpath.match(REGEX_UPPERCASE);
  if (!match?.groups?.path) return value;

  const myValue = getValueByPath(obj, match.groups.path, { tz: opt.tz });
  if (myValue == null) return '';
  
  const res = String(myValue).toUpperCase();
  if (DEBUG) console.log(`sfxUpperCase() => ${res}`);
  return res;
}
// ==============================================
function sfxDates(obj, fullpath, value, opt) {
  const match = fullpath.match(REGEX_DATES);
  if (!match?.groups?.path) return value;
  
  const { path: subpath, ab, tf, lang } = match.groups;

  // remove last 's'
  let interval = tf.replace(/s$/, '');
  let timeframe = false;
  if (interval === 'timeframe') {
    interval = 'second';
    timeframe = true;
  }
  let spell = false;
  if (interval.startsWith('spell')) {
    interval = 'second';
    spell = true;
  }

  if (DEBUG) console.log(`sfxDates() "${fullpath}"`);
  if (DEBUG) console.debug({ subpath, ab, interval, lang });

  // do not use opt.date because of dateformat
  const myValue = getValueByPath(obj, subpath, { tz: opt.tz });
  if (!dayjs(myValue).isValid()) {
    if (DEBUG) console.debug(`...got invalid date: "${myValue}", return ""`);
    return '';
  }

  if (DEBUG) console.debug(`...got "${myValue}"`);
  const myDate = parseDateString(myValue, opt);
  if (DEBUG) console.debug(`...parsed: ${myDate.toISOString()}`);

  let res = '';
  // main logic

  if (ab === 'after') {
    res = (opt.tz)
      ? dayjs().tz(opt.tz).diff(myDate, interval)
      : dayjs().diff(myDate, interval);
  }
  else if (ab === 'before') {
    res = (opt.tz)
      ? myDate.tz(opt.tz).diff(dayjs(), interval)
      : myDate.diff(dayjs(), interval);
  }

  // timeframes are: 4d12h30m
  if (timeframe) {
    res = tools.timetotf2(res * 1000);
  }
  if (spell) {
    res = doSpell(res, lang);
  }

  if (DEBUG) console.debug(`=> "${res}"`);
  return res;
}
// ==============================================
function parseDateString(value, opt) {

  // parsing by timestamp
  if (value.match(REGEX_DIGITS)) {
    const date = dayjs(parseInt(value));
    return date;
  }

  // parsing without tz
  if (value.match(REGEX_TZ) || !opt.tz) {
    const date = dayjs(value);
    return date;
  }

  // parsing with tz
  const date = dayjs.tz(value, opt.tz);
  return date;
}
// ==============================================
function doSpell(timeDifference, _lang = 'ru') {
  const supportedLangs = ['ru', 'en'];
  const lang = supportedLangs.includes(_lang) ? _lang : 'en';
  if (DEBUG) console.log(`doSpell() diff ${timeDifference} (${lang})`);

  const absDiff = Math.max(0, timeDifference);
  const units = {
    y: 60 * 60 * 24 * 365,
    M: 60 * 60 * 24 * 30,
    d: 60 * 60 * 24,
    h: 60 * 60,
    m: 60,
    s: 1
  };

  const found = Object.entries(units).find(([, sec]) => absDiff >= sec);

  if (found) {
    const [char, sec] = found;
    const val = Math.floor(absDiff / sec);
    const res = `${val} ${spellTimeframe(val, char, lang)}`;
    if (DEBUG) console.debug(`=> "${res}"`);
    return res;
  }

  const res = `0 ${spellTimeframe(0, 'm', lang)}`;
  if (DEBUG) console.debug(`=> "${res}"`);
  return res;
}


// ==============================
function spellTimeframe(num, char, lang) {
  if (DEBUG) console.log(`spellTimeframe() ${num} ${char} ${lang}`);

  const p = {
    ru: {
      s: { one: 'секунда', elv: 'секунд', two: 'секунды' },
      m: { one: 'минута', elv: 'минут', two: 'минуты' },
      h: { one: 'час', elv: 'часов', two: 'часа' },
      d: { one: 'день', elv: 'дней', two: 'дня' },
      M: { one: 'месяц', elv: 'месяцев', two: 'месяца' },
      y: { one: 'год', elv: 'лет', two: 'года' }
    },
    en: {
      s: { one: 'second', elv: 'seconds', two: 'seconds' },
      m: { one: 'minute', elv: 'minutes', two: 'minutes' },
      h: { one: 'hour', elv: 'hours', two: 'hours' },
      d: { one: 'day', elv: 'days', two: 'days' },
      M: { one: 'month', elv: 'months', two: 'months' },
      y: { one: 'year', elv: 'years', two: 'years' }
    }
  };

  if (num >= 10 && num <= 20) return p[lang][char].elv;
  if (num % 10 === 1) return p[lang][char].one;
  if (num % 10 >= 2 && num % 10 <= 4) return p[lang][char].two;
  return p[lang][char].elv;
}

// ==============================================
// Today is [sunny|rainy|cloudy] and [hot|cold]
function applyRandomReplace(src, opt) {
  if (!opt.random) return src;
  if (typeof src !== 'string' || !src) return src;

  if (DEBUG) console.log(`applyRandomReplace() "${src}"`);

  let result = src;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const match = result.match(REGEX_GROUP);
    if (!match) break;

    const [fullMatch, groupContent] = match;
    const options = groupContent.split('|').map((x) => x.trim()).filter(Boolean);

    if (options.length === 0) break;

    const randomIndex = Math.floor(Math.random() * options.length);
    const substitution = options[randomIndex];

    result = result.replace(fullMatch, substitution);
  }

  if (DEBUG) console.debug(`=> "${result}"`);
  return result;
}

// ==============================================
function isDateTime(value) {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value !== 'string') return false;

  // Проверка, что строка похожа на дату
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/;
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }

  const date = new Date(value);
  const res = !Number.isNaN(date.getTime());

  if (DEBUG) console.log(`isDateTime() => ${res}`);
  return res;
}
// ==============================================
function getDefaultParams(params) {
  if (DEBUG) console.log(`getDefaultParams()`);

  const opt = { ...{
    true: 'true',
    false: 'false',
    null: '',
    undefined: '',
    empty: '',
    escape: undefined,
    crlf: undefined,
    array: undefined,
    date: true,
    dateformat: 'YYYY-MM-DD HH:mm:ss',
    tz: undefined,
    random: false
  },
  ...params };

  if (DEBUG) console.debug(opt);
  return opt;
}


module.exports = {
  replace: processText
};
