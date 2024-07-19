const REGEX_GROUP = /\[([^[]+?\|[^[]+?)\]/;
const DEBUG = false;

// ==============================================
function randomText(src) {
  if (DEBUG) console.log(`call randomText: ${src}`);

  if (!src || typeof src !== 'string') return src;
  if (!src.match(REGEX_GROUP)) return src;

  const regexResult = src.match(REGEX_GROUP);
  if (DEBUG) console.log(`regex:`);
  if (DEBUG) console.log(regexResult);

  const fullMatch = regexResult[0];
  const group = regexResult[1].split('|');
  const idx = Math.round(Math.random() * (group.length -1));
  const subst = group[idx].trim();

  if (DEBUG) console.log(`group len: ${group.length}, random index: ${idx}`);
  if (DEBUG) console.log(group);
  if (DEBUG) console.log(`selected: '${subst}'`);

  let res = src.replace(fullMatch, subst);
  res = randomText(res);

  return res;
}

module.exports.randomtext = randomText;
