# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Node.js utility library (`tools`) providing common helper functions for logging, template replacement, text sanitization, queuing, and data manipulation.

## Commands

```bash
# Run tests
npx jest

# Run a single test file
npx jest __tests__/replace.test.js

# Run tests excluding queue (uses real timers, slow)
npx jest --testPathIgnorePatterns='queue'

# Run linting
npx eslint .
```

## Architecture

### Entry Point
`index.js` - exports all utilities. Does NOT auto-initialize logger on require (unlike previous versions).

### Core Modules

**logger.js** - Console enhancement and log4js configuration. Depends on textify, timeframes and files.
- `configureConsole()` — patches `console.*` (debug/log/info/warn/error) with colored, timestamped output. Level mapping: `log→trace`, `info→debug`, `debug→debug`, `warn→warn`, `error→error`.
- `configureLogger(minlevel, opts)` — sets up log4js with file rotation. Writes trace-level to `<dir>/<prefix>trace.log`, warn+ to `<dir>/<prefix>error.log`. Options: `prefix` (filename prefix), `dir` (log directory, default `'logs'`), `hourly` (hourly rotation), `keep` (timeframe like `'30d'` — enables daily purge of the rotation folders; off unless set). Redirects all five `console.*` methods into log4js (`log→trace`, `info→debug`, `debug→debug`, `warn`, `error`) so console output lands in the files too — a method left unredirected keeps the `configureConsole` wrapper and writes to native stdout only. Returns log4js logger instance with `logger.shutdown`, `logger.exit` and `logger.stopPurge` attached.
- Internal: `formatLog(message, level, opt, datetime)` — core formatter returning `{ text, prefix, data, ms }`. Level-colored badges, ISO timestamp, time-diff suffix for trace/debug, Error stack parsing.
- Internal: `formatLog4JS(logEvent)` — adapter from log4js event to formatLog with single-entry result cache.
- `logger.exit(code)` — flushes pending log writes, then `process.exit(code)`. Required instead of bare `process.exit()`: log4js writes files asynchronously, so exiting directly drops the last lines from `trace.log`/`error.log` (they still reach the console, which is synchronous). Idempotent — the first call wins, so a second `exit()` cannot cut short the first flush.
- `logger.shutdown(cb, timeout = 3000)` — guarded wrapper over `log4js.shutdown`. Returns a promise when called without a callback. The callback fires exactly once and is guaranteed to fire: on timeout it is called with an `Error` so a stuck appender cannot hang the process. Nothing logged after shutdown reaches file or console.
- `startPurge(logdir, keep, prefix)` / `stopPurge()` — daily (`PURGE_INTERVAL`, 24h) cleanup of rotated logs via `purgeOldFiles`. Purges `<logdir>/<prefix>trace.old` and `<logdir>/<prefix>error.old`, filtered to `*.log`: with `keepFileExt` streamroller builds names as `<name>.<pattern>.<ext>`, so rotated files land in `<prefix>trace.old/…`, not in `<logdir>/old`. Active `trace.log`/`error.log` sit in the root of `<logdir>`, outside those folders, and so survive. Timer is `unref`'d so it cannot keep the process alive, and the purge promise is caught — an unhandled rejection inside a timer would kill the process. Started by `configureLogger` only when `opts.keep` is set; exposed as `logger.stopPurge`.
- Signal / crash handlers are the consuming project's job — the library installs none. See `LOGGER-HOW-TO-USE.md`.
- Internals exported with `_` prefix for testing: `_formatLog`, `_resetColors`, `_getTimeDifference`, `_startPurge`, `_stopPurge`.
- Known issue: log4js does not recover after disk full — requires process restart.
- Known issue: log4js's own retention (`numBackups`) is inert here — streamroller lists only the base file's directory, while the rotation pattern writes into `<prefix>trace.old/yyyy-MM/`. Hence the `keep` option.
- See `LOGGER-HOW-TO-USE.md` for usage guidelines in other projects.

**textify.js** - Object-to-string conversion for logging/debugging.
- `textify(obj, options)` — pretty-prints values with optional color support; handles dates, sorts keys, truncates output.
- `typeof(src)` — extended type detection, e.g. `"array (5 items of [string,number])"`.
- Options: `colors` (ANSI), `crlf` (preserve newlines), `dateformat` (dayjs format), `tz` (timezone), `autosort`/`sort` (key sorting), `skipunderscore` (skip `_` keys), `limit` (truncate visible chars, ANSI-aware).
- Type handling order: null/undefined/boolean/number → toString; Date → dayjs; ISO strings → reformatted; other strings → as-is; objects/arrays → util.inspect with optional sorting.
- Dependencies: lodash, dayjs, util.

**timeframes.js** - Bidirectional conversion between human-readable timeframe strings and milliseconds. Dependency: dayjs.
- `tftotime(s, fromDate?)` — parses `"15s"`, `"10m"`, `"24h"`, `"7d"`, `"1y"`, combined `"2h3m10s"`. Unknown/missing-unit substrings are silently ignored — a bare number-only string like `"2"` matches no unit and returns `0`. A JS `number` input is returned as-is (treated as already-milliseconds, not seconds).
- `timetotf(diff)` — ms to compact single-unit string (`"Xms"`, `"Xs"`, `"Xm"`, `"Xh"`, `"Xd"`). Threshold for hours→days is `4*DAY`.
- `timetotf2(diff)` — ms to verbose multi-unit string (`"2y5d3h15m20s"`).
- Units: `s`, `m`, `h`, `d` use constant multiplication; `w`, `M` (uppercase), `y` use dayjs calendar arithmetic.
- Implementation detail: module-level `REGEX_TF` with `/g` flag — `lastIndex` reset before each call.

**queue.js** - Rate-limiting queue with triple-level throttling, designed for Telegram bots.
- `queue({ RPS, qname, to, priority, RPS_CHAT, RPM_CHAT })` — returns promise that resolves when request can proceed. Creates queue if it doesn't exist.
- `sleep(ms)` / `timeout(ms)` — promise-based delay (same function, aliased).
- `getQueueSize(qname)` — returns current queue length.
- Rate limiting: global RPS, per-recipient RPS (`RPS_CHAT`), per-group RPM (`RPM_CHAT`, default 20). Group chats detected by chat ID starting with `"-"`.
- Processes by priority (lower = higher). Auto-cleans stale limits every 100 operations.

**replace.js** - Template engine for string interpolation with nested placeholders:
- Supports `{path.to.value}` syntax with lodash's `_.get()`
- Conditional blocks: `{? ... }` - renders only if all placeholders resolve
- Nested placeholders: `{products.{user.name}.title}`
- Boolean prefixes: `{!path}` (negation), `{!!path}` (truthy coercion)
- Regex extraction: `{/regex/path}` - extracts capture group from value
- Suffixes: `.toLowerCase`, `.toUpperCase`, `.asNumber`, `.asKMB`, `.after.days`, `.before.hours`, `.after.spell.ru`, `.before.spell.en` (human-readable time diff)
- Random: `{rnd.9}` generates 0-9, `{rnd.09}` generates 00-09

**jparse.js** - Extended JSON.parse that handles:
- Object pointers via `{path}` syntax
- JSON strings with placeholder replacement
- Falls back to creating `{defaultkey: value}` objects

**value.js** - Smart value parser / type coercion:
- `val(x, def)` - converts strings to native types (numbers, booleans, null)
- Safely handles edge cases: phone numbers (`+7...`), hex/oct/bin literals, exponential notation, trailing dot — kept as strings
- Non-string input returned as-is; `null`/`undefined` returns `def`

**sanitize.js** - Text normalization:
- Converts lookalike Unicode characters (homoglyphs) to standard RU/EN
- Cleans emojis and normalizes whitespace

**combine.js** - Generates all possible combinations of parameter values (cartesian product).

**randomtext.js** - Replaces bracketed alternatives like `[option1|option2]` with a random selection.

**html.js** - Parses and corrects HTML using cheerio, normalizing content (e.g. `&nbsp;` entities).

### Supporting Modules
- `validate.js` - date/time format validators (`isTime`, `isDate`, `isDateTime`)
- `notify.js` - HTTP notification helper
- `files.js` - file utilities (`purgeOldFiles(folder, older, opts)`) — leaf module: requires `./timeframes` and `./arrays` directly, never the `./index` barrel (that was a require cycle). `opts.ext` (string or array) restricts deletion to matching names, compared with `endsWith` so composites like `.log.gz` work; without it every file older than `older` goes, which is what external callers rely on. Does not create the folder it is pointed at — a missing folder yields `[]`.
- `arrays.js` - adds `Array.prototype.forEachAsync`, exports `forEachAsyncFn`

## Code Style

ESLint configured with Airbnb base + custom rules. Key settings:
- `stroustrup` brace style
- Single quotes preferred
- `camelcase` disabled
- `no-console` disabled
- Max line length: 512 chars
