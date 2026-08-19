const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LOGGER = path.resolve(__dirname, '../../logger.js');

// ==============================================
// запускает logger в отдельном процессе: только так проверяются вещи,
// которые видны лишь после реального завершения процесса
// возвращает { code, stdout, errorlog, tracelog }
// ==============================================
function runChild(body, args = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
  const script = path.join(dir, 'child.js');

  fs.writeFileSync(script, `
    const configureLogger = require(${JSON.stringify(LOGGER)});
    const log = configureLogger('silly', { dir: ${JSON.stringify(path.join(dir, 'logs'))} });
    ${body}
  `);

  let code = 0;
  let stdout = '';
  try {
    stdout = execFileSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  }
  catch (e) {
    code = e.status;
    stdout = e.stdout || '';
  }

  const read = (name) => {
    const file = path.join(dir, 'logs', name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  };

  return { code, stdout, errorlog: read('error.log'), tracelog: read('trace.log') };
}

module.exports = { runChild };
