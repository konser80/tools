const axios = require('axios');
const tools = require('./index');

const NOTIFY_URL = 'https://bs1.konser.ru/notifybot/alert';
const TIMER_WAIT = 2000;
const DEBUG = false;

let job = null;
let array = {};

// ==============================================
function notify(param, url) {
  if (DEBUG) console.log(`[ ] onEvent: ${param}`);

  let address = NOTIFY_URL;
  if (url && typeof url === 'string' && url.startsWith('https://')) address = url;

  const txt = tools.textify(param, { colors: false });
  array[txt] = array[txt] +1 || 1;

  if (job) clearTimeout(job);
  job = setTimeout(() => onTimer(address), TIMER_WAIT);
}

// ==============================================
function onTimer(url) {

  if (DEBUG) console.log('[+] notify: sending array');
  if (DEBUG) console.log(array);

  Object.keys(array).forEach(async (key) => {
    let text = key;
    if (array[key] > 1) text += ` [count: ${array[key]}]`;

    if (DEBUG) console.log(`[ ] sending text: ${text}`);
    const payload = { txt: text };
    
    // ready? send!
    try {
      await axios.post(url, payload);
      if (DEBUG) console.log(`[+] sent text`);
    }
    catch (err) {
      console.warn(` notify: ${err.message}`);
    }
  });

  array = {};
}


module.exports.notify = notify;
