// =============================================================
function combine(newObject) {
  let res = [];

  const key = getFirstArrayKey(newObject);
  if (!key) return [newObject];

  // key is an array?
  if (Array.isArray(newObject[key])) {
    newObject[key].forEach((item) => {
      // create copy of object
      const obj = { ...newObject };
      obj[key] = item;

      res = res.concat(combine(obj));
      // return res;
    });
  } // if array

  // if pseudo-array
  const o = newObject[key];
  if (o.from !== undefined && o.to !== undefined) {
    let _from = o.from;
    if (typeof (_from) === 'string') _from = newObject[_from];
    if (o.add) _from += o.add;
    if (o.mult) _from *= o.mult;

    let _to = o.to;
    if (typeof (_to) === 'string') _from = newObject[_to];
    if (o.mult) _to *= o.mult;

    let _step = o.step || 1;
    if (typeof(_step) == 'string') _step = newObject[_step];
    if (o.mult) _step = _step * o.mult;

    for (let i = _from; i <= _to;  i+= _step || 1) {
      // create copy of object
      let obj = Object.assign({}, newObject);
      obj[key] = Number(i.toFixed(8));
      res = res.concat(combine(obj));
    };
  }; // pseudo array

  return res;

  function getFirstArrayKey(obj) {
    for (let i=0; i < Object.keys(obj).length; i++) {
      const key = Object.keys(obj)[i];
      if (obj[key] === null) continue;

      if (Array.isArray(obj[key])
        || (obj[key].from !== undefined && obj[key].to !== undefined)) return key;
      }
    return false;
  }
} // fn

module.exports = combine;
