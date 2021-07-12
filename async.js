// ==============================================
/* eslint-disable no-extend-native, no-await-in-loop */

async function forEachAsyncFn(callback) {
  for (let index = 0; index < this.length; index += 1) {
    await callback(this[index], index, this);
  }
}

Object.defineProperty(Array.prototype, 'forEachAsync', {
  value: forEachAsyncFn,
  enumerable: false,
});

/* eslint-enable no-extend-native, no-await-in-loop */
