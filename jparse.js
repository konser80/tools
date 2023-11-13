const _ = require('lodash');
const replace = require('./pathreplace');

const REGEX_ARRAY = /^\[.+\]$/;
const REGEX_JSON = /^\s*(\[\s*)?\{([\s\S]*[:]+[\s\S]+)}\s*\]?\s*$/; // could be multiline
const REGEX_PATH = /^\{([^": ]+)}$/; // can't contain : and " at the start

// ==============================================
// extended JSON.parse

function parseObject(obj, src, defaultkey, replaceOptions) {
  if (src === undefined || src === null || src === '') {
    const res = {};
    if (defaultkey) res[defaultkey] = null;
    return res;
  }

  // already an object
  if (typeof src === 'object') {
    if (defaultkey
      && !Array.isArray(src)
      && !_.has(src, defaultkey)) src[defaultkey] = null;
    // replace object values
    const dest = replace(obj, src, replaceOptions);
    return dest;
  }

  // pointer (path) to an object?
  if (typeof src === 'string' && src.match(REGEX_PATH)) {
    let srcpath = src.match(REGEX_PATH)[1];

    // in case of complex paths
    srcpath = replace(obj, srcpath, replaceOptions);

    const srcobject = _.get(obj, srcpath);
    if (typeof srcobject === 'object') {
      // default key
      if (defaultkey
        && !Array.isArray(srcobject)
        && !_.has(srcobject, defaultkey)) srcobject[defaultkey] = null;
      return srcobject;
    }
  }

  // ok, this was not a path to object, let's check json
  if (typeof src === 'string' && (src.match(REGEX_JSON) || src.match(REGEX_ARRAY))) {
    let jdata;
    try {
      const params = { ...{ crlf: '\\n', escape: '\\"' }, ...replaceOptions };
      jdata = replace(obj, src, params); // eslint-disable-line
      jdata = JSON.parse(jdata || '{}');
      jdata = deepStringFn(jdata, (item) => item.replace(/\\n/g, '\n'));

      if (defaultkey
        && !Array.isArray(jdata)
        && !_.has(jdata, defaultkey)) jdata[defaultkey] = null;
      return jdata;
    }
    catch (err) {
      // was not an object, sorry
      // log.warn(`[-] parse: ${err.message}`);
      highlightParseError(err, jdata);
    }
  }

  // not an object - just a key
  const res = {};
  res[defaultkey || 'id'] = replace(obj, src, replaceOptions);
  return res;
}
// ==============================================
function highlightParseError(e, _string) {
  const err = e.message;
  const REGEX = /in JSON at position (\d+)/;
  const regexResult = err.match(REGEX);
  if (!regexResult) return '';

  const string = _string.replace(/\n/gm, ' ');
  // string = string.replace(/\t/gm, ' ');
  // string = string.replace(/\r/gm, ' ');
  // console.log(string);

  const pos = parseInt(regexResult[1]);
  // console.log(`pos ${pos}`);
  // console.log(`string.length ${string.length}`);

  const start = (pos <= 20) ? 0 : pos -20;
  const end = (pos +20 > string.length-1) ? string.length-1 : pos +20;
  // console.log(`start ${start}, end ${end}`);

  const before = string.slice(start, pos).grey;
  const match = string.slice(pos, pos+1).white.bgRed;
  const after = string.slice(pos+1, end).grey;
  // console.log(`'${before}'`);
  // console.log(`'${match}'`);
  // console.log(`'${after}'`);

  const res = `${before}${match}${after}`;
  console.warn(`[-] parse: ${err}: ${res}`);
}

// ==============================================
function deepStringFn(obj, fn) {

  Object.keys(obj).forEach((key) => {

    if (typeof obj[key] === 'string') {
      obj[key] = fn(obj[key]);
      return;
    }

    // ok, so this is an object
    if (typeof obj[key] === 'object'
    && obj[key] !== null
    && obj[key] !== undefined) {
      deepStringFn(obj[key], fn);
    }
  });

  return obj;
}


module.exports.parse = parseObject;
