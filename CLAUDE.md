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

**logger.js** - Console enhancement and log4js configuration. Depends on textify and timeframes.
- `configureConsole()` — patches `console.*` (debug/log/info/warn/error) with colored, timestamped output. Level mapping: `log→trace`, `info→debug`, `debug→debug`, `warn→warn`, `error→error`.
- `configureLogger(minlevel, opts)` — sets up log4js with file rotation. Writes trace-level to `<dir>/<prefix>trace.log`, warn+ to `<dir>/<prefix>error.log`. Options: `prefix` (filename prefix), `dir` (log directory, default `'logs'`), `hourly` (hourly rotation). Returns log4js logger instance with `logger.shutdown` attached.
- Internal: `formatLog(message, level, opt, datetime)` — core formatter returning `{ text, prefix, data, ms }`. Level-colored badges, ISO timestamp, time-diff suffix for trace/debug, Error stack parsing.
- Internal: `formatLog4JS(logEvent)` — adapter from log4js event to formatLog with single-entry result cache.
- Internals exported with `_` prefix for testing: `_formatLog`, `_resetColors`, `_getTimeDifference`.
- Known issue: log4js does not recover after disk full — requires process restart.
- See `LOGGER-HOW-TO-USE.md` for usage guidelines in other projects.

**textify.js** - Object-to-string conversion for logging/debugging.
- `textify(obj, options)` — pretty-prints values with optional color support; handles dates, sorts keys, truncates output.
- `typeof(src)` — extended type detection, e.g. `"array (5 items of [string,number])"`.
- Options: `colors` (ANSI), `crlf` (preserve newlines), `dateformat` (dayjs format), `tz` (timezone), `autosort`/`sort` (key sorting), `skipunderscore` (skip `_` keys), `limit` (truncate visible chars, ANSI-aware).
- Type handling order: null/undefined/boolean/number → toString; Date → dayjs; ISO strings → reformatted; other strings → as-is; objects/arrays → util.inspect with optional sorting.
- Dependencies: lodash, dayjs, util.

**timeframes.js** - Bidirectional conversion between human-readable timeframe strings and milliseconds. Dependency: dayjs.
- `tftotime(s, fromDate?)` — parses `"15s"`, `"10m"`, `"24h"`, `"7d"`, `"1y"`, combined `"2h3m10s"`. Unknown units silently ignored. Defaults to hour if no suffix.
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
- `files.js` - file utilities (`purgeOldFiles`)
- `arrays.js` - adds `Array.prototype.forEachAsync`, exports `forEachAsyncFn`

## Code Style

ESLint configured with Airbnb base + custom rules. Key settings:
- `stroustrup` brace style
- Single quotes preferred
- `camelcase` disabled
- `no-console` disabled
- Max line length: 512 chars
