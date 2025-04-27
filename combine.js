// ==============================================
function combine(params) {
  const keys = Object.keys(params);
  return combineRecursive(keys, keys, 0, {}, params);
}

// ==============================================
function generateRange(from, to, step = 1) {
  const range = [];
  for (let i = from; i <= to; i += step) {
    range.push(+i.toFixed(6));
  }
  return range;
}

// ==============================================
function combineRecursive(arrays, keys, index = 0, current = {}, params) {
  if (index === arrays.length) {
    return [current];
  }

  const result = [];
  const key = keys[index];
  const param = params[key];

  if (Array.isArray(param)) {
    // Поддержка массивов значений
    param.forEach((value) => {
      const newCombination = { ...current, [key]: value };
      result.push(...combineRecursive(arrays, keys, index + 1, newCombination, params));
    });
    return result;
  }

  if (typeof param !== 'object') {
    const newCombination = { ...current, [key]: param };
    return combineRecursive(arrays, keys, index + 1, newCombination, params);
  }

  let { from } = param;
  const { to } = param;
  const step = param.step || 1;

  // Поддержка зависимостей (если `from` — строка, берём из `current`)
  if (typeof from === 'string') from = current[from];

  const range = generateRange(from, to, step);

  range.forEach((value) => {
    const newCombination = { ...current, [key]: value };
    result.push(...combineRecursive(arrays, keys, index + 1, newCombination, params));
  });

  return result;
}

module.exports = combine;
