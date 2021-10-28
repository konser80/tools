const REGEX_GROUP = /\[([^[]+?\|[^[]+?)\]/;

// ==============================================
function randomText(src) {

  if (!src || typeof src !== 'string') return src;
  if (!src.match(REGEX_GROUP)) return src;

  const regexResult = src.match(REGEX_GROUP);

  const fullMatch = regexResult[0];
  const group = regexResult[1].split('|');
  const idx = Math.round(Math.random() * (group.length -1));
  const subst = group[idx];

  let res = src.replace(fullMatch, subst);
  res = randomText(res);

  return res;
}

module.exports.randomtext = randomText;
