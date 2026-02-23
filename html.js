const cheerio = require('cheerio');

const pre = `<html><head></head><body>`;
const post = `</body></html>`;

// ==============================================
function getCorrectedHTML(html) {

  const fullHtml = pre + html + post;
  const $ = cheerio.load(fullHtml);

  // get body content
  const res = $('body')
    .html()
    .replace(/&nbsp;/g, '\u00A0') // fix &nbsp;
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>');

  return res;
}

module.exports.correctHTML = getCorrectedHTML;
