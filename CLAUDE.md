# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Node.js utility library (`tools`) providing common helper functions for logging, template replacement, text sanitization, and data manipulation.

## Commands

```bash
# Run tests
npx jest

# Run a single test file
npx jest __tests__/replace.test.js

# Run linting
npx eslint .

# Lint specific file
npx eslint replace.js
```

## Architecture

### Entry Point
`index.js` - exports all utilities and initializes the logger/console enhancement on require.

### Core Modules

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
- Use for typing values from external sources: env vars, query params, configs

**sanitize.js** - Text normalization:
- Converts lookalike Unicode characters (homoglyphs) to standard RU/EN
- Cleans emojis and normalizes whitespace

### Re-exported External Libraries
These modules live in separate npm packages and are re-exported from `index.js` for convenience:

- **`logger`** (npm: `logger`) - Console enhancement and log4js configuration:
  - `configureConsole()` - enhances console.* with timestamps and colors
  - `configureLogger(minlevel, opts)` - sets up log4js with file rotation
- **`textify`** (npm: `textify`) - Object-to-string conversion:
  - `textify` - pretty-prints objects with optional color support; handles dates, sorts keys, truncates output
  - `typeof` - extended type detection
- **`timeframes`** (npm: `timeframes`) - time conversion utilities:
  - `tftotime`, `timetotf`, `timetotf2` - convert between milliseconds and human-readable time (`4d12h30m`)
- **`tg-queue`** (npm: `tg-queue`) - task queue:
  - `queue` - simple task queue with timeout support
  - `sleep` / `timeout` - promise-based delay

### Supporting Modules
- `validate.js` - date/time format validators (`isTime`, `isDate`, `isDateTime`)
- `notify.js` - HTTP notification helper
- `files.js` - file utilities (`purgeOldFiles`)
- `arrays.js` - adds `Array.prototype.forEachAsync`

## Code Style

ESLint configured with Airbnb base + custom rules. Key settings:
- `stroustrup` brace style
- Single quotes preferred
- `camelcase` disabled
- `no-console` disabled
- Max line length: 512 chars
