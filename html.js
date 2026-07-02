const sanitizeHtml = require('sanitize-html');

// Telegram-friendly defaults — see https://core.telegram.org/bots/api#html-style
const TG_ALLOWED_TAGS = [
  'b', 'strong',
  'i', 'em',
  'u', 'ins',
  's', 'strike', 'del',
  'a',
  'code', 'pre',
  'br',
  'span', 'tg-spoiler', 'tg-emoji',
  'blockquote',
];

const TG_ALLOWED_ATTRIBUTES = {
  a: ['href'],
  span: ['class'],
  code: ['class'],
  blockquote: ['expandable'],
  'tg-emoji': ['emoji-id'],
};

// ==============================================
// sanitize-html based; unknown tags are escaped (e.g. <Mr Robot> -> &lt;Mr Robot&gt;)
function getCorrectedHTML(html, opts = {}) {

  const allowedTags = opts.allowedTags || TG_ALLOWED_TAGS;
  const allowedAttributes = opts.allowedAttributes || TG_ALLOWED_ATTRIBUTES;

  // pre-escape anything that looks like a tag but isn't in the whitelist.
  // Without this, sanitize-html parses `<Mr Robot>` as `<mr robot>`, drops
  // the unknown attribute, and we lose both case and the word "Robot".
  const allowSet = new Set(allowedTags.map((t) => t.toLowerCase()));
  const preEscaped = html.replace(
    /<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g,
    (m, name) => (allowSet.has(name.toLowerCase())
      ? m
      : m.replace(/</g, '&lt;').replace(/>/g, '&gt;')),
  );

  const cleaned = sanitizeHtml(preEscaped, {
    allowedTags,
    allowedAttributes,
    // Telegram mentions use tg://user?id=... — keep it alongside the safe web schemes.
    allowedSchemes: opts.allowedSchemes || ['http', 'https', 'mailto', 'tel', 'tg'],
    disallowedTagsMode: opts.disallowedTagsMode || 'escape',
  });

  // Telegram rejects bare <span>; only <span class="tg-spoiler"> is allowed.
  // Unwrap any <span> that doesn't carry that exact class — drops the tag,
  // keeps its text content.
  const spanFixed = cleaned.replace(
    /<span\b([^>]*)>([\s\S]*?)<\/span>/g,
    (m, attrs, content) => (/class="tg-spoiler"/.test(attrs) ? m : content),
  );

  // keep &nbsp; collapse — does not affect tag/entity escaping
  return spanFixed.replace(/&nbsp;/g, ' ');
}

module.exports.correctHTML = getCorrectedHTML;
