const queues = {};
let operationsCount = 0;
const CLEANUP_THRESHOLD = 100;

const DEBUG = false;

// ==============================================
async function queue({ RPS, qname, to = 'somebody', priority = 2, RPS_CHAT = 1, RPM_CHAT = 20 }) {
  if (DEBUG) console.log(`queue: NEW call to chat:${to}`);

  // Интервал на основе глобального RPS
  const interval = 1000 / (RPS || 100);

  const promise = new Promise((resolve) => {

    // we don't have this queue
    if (!queues[qname]) {
      const now = Date.now();

      // create queue
      queues[qname] = [];
      queues[qname].lastTime = now;
      queues[qname].processing = false;
      queues[qname].chatLimits = {};
      queues[qname].RPS_CHAT = RPS_CHAT;
      queues[qname].groupRpmLimits = {};
      queues[qname].RPM_CHAT = RPM_CHAT;

      if (DEBUG) console.log(`...creating new queue '${qname}' & resolve this`);

      queues[qname].chatLimits[to] = queues[qname].chatLimits[to] || now;

      // Track first message for group RPM limiting
      if (isGroupChat(to)) {
        queues[qname].groupRpmLimits[to] = [now];
      }

      resolve();
    }
    // eсли очередь уже существует, добавляем запрос в очередь
    else {
      if (DEBUG) console.log(`...queue ${qname} exists: ${queues[qname].length} items, adding to queue`);
      queues[qname].push({ resolve, to, priority });

      if (!queues[qname].processing) {
        if (DEBUG) console.log(`...queue ${qname}: call processQueue`);
        queues[qname].processing = true;
        processQueue(queues[qname], interval);
      }

    }
  });
  return promise;
}
// ==============================================
// Функция для обработки конкретной очереди с учетом RPS
function processQueue(q, interval) {
  if (!q.length) {
    if (DEBUG) console.log(`queue is empty, nothing to do`);
    q.processing = false;
    return;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - q.lastTime;

  // sort by priority
  q.sort((a, b) => a.priority - b.priority);

  if (DEBUG) console.log(`fn processQueue(), q.len: ${q.length}`);

  // Флаг для отслеживания, был ли обработан хотя бы один запрос
  let processedRequest = false;

  // Перебираем все запросы в очереди
  q.forEach((request, i) => {
    if (processedRequest) return;

    const { resolve, to } = request;

    // init chat limit
    if (!q.chatLimits[to]) q.chatLimits[to] = 0;

    const timeSinceLastChatRequest = now - q.chatLimits[to];
    const chatInterval = 1000 / q.RPS_CHAT; // Используем RPS_CHAT для конкретной очереди

    if (timeSinceLastChatRequest >= chatInterval &&
        timeSinceLastRequest >= interval &&
        canSendToGroup(q, to, now)) {
      // Если лимит для чата истёк, обновляем время последнего запроса для чата
      q.chatLimits[to] = now;

      // Track this request for group RPM limiting
      if (isGroupChat(to)) {
        if (!q.groupRpmLimits[to]) q.groupRpmLimits[to] = [];
        q.groupRpmLimits[to].push(now);
      }

      // Удаляем запрос из очереди
      q.splice(i, 1);
      q.lastTime = now;
      processedRequest = true;
      operationsCount += 1;
      if (!q.length) q.processing = false;

      if (DEBUG) console.log(`... >> resolve()`);
      resolve();
    }
  });

  // cleanupChatLimits
  if (operationsCount >= CLEANUP_THRESHOLD) {
    cleanupChatLimits(q.chatLimits);
    cleanupGroupRpmLimits(q.groupRpmLimits);
    operationsCount = 0;
  }

  // Рассчитываем единый `delay` для следующего вызова
  if (q.length > 0) {
    let delay = interval;
    if (processedRequest) {
      const nextInterval = interval - (Date.now() - q.lastTime);
      delay = nextInterval > 0 ? nextInterval : 0;
      if (DEBUG) console.log(`...calc delay: ${delay}`);
    }
    setTimeout(() => processQueue(q, interval), delay);
  }
}
// ==============================================
// Функция для очистки старых записей о чатах
function cleanupChatLimits(chatLimits) {
  const now = Date.now();
  Object.keys(chatLimits).forEach((chat) => {
    if (now - chatLimits[chat] > 3000) delete chatLimits[chat];
  });
}

// ==============================================
// Check if chat is a Telegram group (chatId starts with "-" or is negative number)
function isGroupChat(to) {
  if (typeof to === 'string') {
    return to.startsWith('-');
  }
  if (typeof to === 'number') {
    return to < 0;
  }
  return false;
}

// ==============================================
// Check if we can send a message to a group (RPM limit check)
function canSendToGroup(q, to, now) {
  if (!isGroupChat(to)) return true;  // Non-groups always pass

  if (!q.groupRpmLimits[to]) q.groupRpmLimits[to] = [];

  // Filter to last 60 seconds
  const oneMinuteAgo = now - 60000;
  q.groupRpmLimits[to] = q.groupRpmLimits[to].filter(ts => ts > oneMinuteAgo);

  // Check if under RPM limit
  return q.groupRpmLimits[to].length < q.RPM_CHAT;
}

// ==============================================
// Cleanup old group RPM limit entries
function cleanupGroupRpmLimits(groupRpmLimits) {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  Object.keys(groupRpmLimits).forEach((chat) => {
    groupRpmLimits[chat] = groupRpmLimits[chat].filter(ts => ts > oneMinuteAgo);
    if (groupRpmLimits[chat].length === 0) {
      delete groupRpmLimits[chat];
    }
  });
}

// ==============================================
function getQueueSize(qname) {
  return queues[qname]?.length || 0;
}

// ==============================================
function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}


module.exports.queue = queue;
module.exports.getQueueSize = getQueueSize;
module.exports.sleep = sleep;
