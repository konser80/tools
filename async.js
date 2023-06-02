// ==============================================

async function forEachAsyncFn(callback) {
  for (let index = 0; index < this.length; index += 1) {
    await callback(this[index], index, this); // eslint-disable-line
  }
}

// ==============================================
/* eslint-disable no-extend-native */
function init() {

  Object.defineProperty(Array.prototype, 'forEachAsync', {
    value: forEachAsyncFn,
    enumerable: false,
  });

}
/* eslint-enable no-extend-native */

module.exports.init = init;
module.exports.forEachAsyncFn = forEachAsyncFn;
