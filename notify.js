const axios = require('axios');
const tools = require('./index');

const log = tools.logger('trace');

const NOTIFY_URL = 'https://bs1.konser.ru/notifybot/alert';
const TIMER_WAIT = 1500;
const DEBUG = false;

let job = null;
let array = {};

// ==============================================
function notify(param) {
  if (DEBUG) log.trace(`[ ] onEvent: ${param}`);

  const txt = tools.textify(param, { colors: false });
  array[txt] = array[txt] +1 || 1;

  if (job) clearTimeout(job);
  job = setTimeout(onTimer, TIMER_WAIT);
}

// ==============================================
function onTimer() {

  if (DEBUG) log.trace('[+] notify: sending array');
  if (DEBUG) log.trace(array);

  Object.keys(array).forEach((key) => {
    let text = key;
    if (array[key] > 1) text += ` [count: ${array[key]}]`;

    if (DEBUG) log.trace(`[ ] sending text: ${text}`);
    const payload = { txt: text };

    // ready? send!
    try {
      axios.post(NOTIFY_URL, payload);
    }
    catch (err) {
      if (DEBUG) log.error(`[-] notify error: ${err.message}`);
    }
  });

  array = {};
}


module.exports.notify = notify;
