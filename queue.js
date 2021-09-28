const dayjs = require('dayjs');

const qline = {};

// ==============================================
async function queue(RPS = 10, key = 'main') {
  const pause = Math.ceil(1000/RPS);

  qline[key] = qline[key] || dayjs();
  const diff = dayjs().diff(qline[key], 'ms');

  // do it now
  if (diff > pause) {
    qline[key] = dayjs();
    return true;
  }

  // wait for your time
  qline[key] = qline[key].add(pause, 'ms');
  const wait = pause - diff;
  await timeout(wait);
  return true;
}

// ==============================================
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports.queue = queue;
module.exports.timeout = timeout;
