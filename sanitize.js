// const _ = require('lodash');
// Used for single RU or EN characters without pair.
// Will show to `sanitize` function that current language does not have twins for a specific symbol
const SKIP = 'SKIP';
const config = {
  emojis: {
    '1️⃣': '1',
    '2️⃣': '2',
    '3️⃣': '3',
    '4️⃣': '4',
    '5️⃣': '5',
    '6️⃣': '6',
    '7️⃣': '7',
    '8️⃣': '8',
    '9️⃣': '9',
    '🔟': '10',
    '💲': '$',
  },
  symbols: [
    { ru: 'а', en: 'a', twins: '@ăǎĂǍаaɑαа⍺ａ𝐚𝑎𝒂𝒶𝓪𝔞𝕒𝖆𝖺𝗮𝘢𝙖𝚊𝛂𝛼𝜶𝝰𝞪AΑАᎪᗅᴀꓮꭺＡ𐊠𖽀𝐀𝐴𝑨𝒜𝓐𝔄𝔸𝕬𝖠𝗔𝘈𝘼𝙰𝚨𝛢𝜜𝝖𝞐' },
    { ru: 'б', en: 'b', twins: 'bб6бᏮⳒ６𑣕𝟔𝟞𝟨𝟲𝟼🯶' },
    { ru: 'с', en: 'c', twins: 'cссcϲсᴄⅽⲥꮯｃ𐐽𝐜𝑐𝒄𝒸𝓬𝔠𝕔𝖈𝖼𝗰𝘤𝙘𝚌CϹСᏟᑕℂℭⅭ⊂Ⲥ⸦ꓚＣ𐊢𐌂𐐕𐔜𑣩𑣲𝐂𝐶𝑪𝒞𝓒𝕮𝖢𝗖𝘊𝘾𝙲🝌' },
    { ru: 'в', en: SKIP, twins: 'ßβϐᏰꞵ𝛃𝛽𝜷𝝱𝞫вBʙΒВвᏴᏼᗷᛒℬꓐꞴＢ𐊂𐊡𐌁𝐁𝐵𝑩𝓑𝔅𝔹𝕭𝖡𝗕𝘉𝘽𝙱𝚩𝛣𝜝𝝗𝞑' },
    { ru: 'е', en: 'e', twins: 'ĕěёЁеeеҽ℮ℯⅇꬲｅ𝐞𝑒𝒆𝓮𝔢𝕖𝖊𝖾𝗲𝘦𝙚𝚎EΕЕᎬᴇℰ⋿ⴹꓰꭼＥ𐊆𑢦𑢮𝐄𝐸𝑬𝓔𝔈𝔼𝕰𝖤𝗘𝘌𝙀𝙴𝚬𝛦𝜠𝝚𝞔' },
    { ru: 'г', en: SKIP, twins: 'гΓГᎱᒥℾⲄ𖼇𝚪𝛤𝜞𝝘𝞒гrгᴦⲅꭇꭈꮁｒ𝐫𝑟𝒓𝓇𝓻𝔯𝕣𝖗𝗋𝗿𝘳𝙧𝚛' },
    { ru: 'д', en: 'd', twins: 'дdDᎠᗞᗪᴅⅅⅮꓓꭰＤ𝐃𝐷𝑫𝒟𝓓𝔇𝔻𝕯𝖣𝗗𝘋𝘿𝙳' },
    { ru: 'з', en: 'z', twins: 'зɜзᴈȝʒӡჳⳍꝫzᴢꮓｚ𑣄𝐳𝑧𝒛𝓏𝔃𝔷𝕫𝖟𝗓𝘇𝘻𝙯𝚣ZΖᏃℤℨꓜＺ𐋵𑢩𑣥𝐙𝑍𝒁𝒵𝓩𝖅𝖹𝗭𝘡𝙕𝚉𝚭𝛧𝜡𝝛𝞕3ƷȜЗӠⳌꝪꞫ３𑣊𖼻𝈆𝟑𝟛𝟥𝟯𝟹🯳' },
    { ru: 'и', en: SKIP, twins: 'иuʋυսᴜꞟꭎꭒｕ𐓶𑣘𝐮𝑢𝒖𝓊𝓾𝔲𝕦𝖚𝗎𝘂𝘶𝙪𝚞𝛖𝜐𝝊𝞄𝞾UՍሀᑌ∪⋃ꓴＵ𐓎𑢸𖽂𝐔𝑈𝑼𝒰𝓤𝔘𝕌𝖀𝖴𝗨𝘜𝙐𝚄' },
    { ru: 'к', en: 'k', twins: 'кKΚКᏦᛕKⲔꓗＫ𐔘𝐊𝐾𝑲𝒦𝓚𝔎𝕂𝕶𝖪𝗞𝘒𝙆𝙺𝚱𝛫𝜥𝝟𝞙kｋ𝐤𝑘𝒌𝓀𝓴𝔨𝕜𝖐𝗄𝗸𝘬𝙠𝚔' },
    { ru: 'л', en: 'l', twins: 'лLʟᏞᒪℒⅬⳐⳑꓡꮮＬ𐐛𐑃𐔦𑢣𑢲𖼖𝈪𝐋𝐿𝑳𝓛𝔏𝕃𝕷𝖫𝗟𝘓𝙇𝙻' },
    { ru: 'м', en: 'm', twins: 'мmｍMΜϺМᎷᗰᛖℳⅯⲘꓟＭ𐊰𐌑𝐌𝑀𝑴𝓜𝔐𝕄𝕸𝖬𝗠𝘔𝙈𝙼𝚳𝛭𝜧𝝡𝞛' },
    { ru: 'о', en: 'o', twins: 'ÖŐӦoо0OoΟοσОоՕօסه٥ھہە۵߀०০੦૦ଠ୦௦ం౦ಂ೦ംഠ൦ං๐໐ဝ၀ჿዐᴏᴑℴⲞⲟⵔ〇ꓳꬽﮦﮧﮨﮩﮪﮫﮬﮭﻩﻪﻫﻬ０Ｏｏ𐊒𐊫𐐄𐐬𐓂𐓪𐔖𑓐𑢵𑣈𑣗𑣠𝐎𝐨𝑂𝑜𝑶𝒐𝒪𝓞𝓸𝔒𝔬𝕆𝕠𝕺𝖔𝖮𝗈𝗢𝗼𝘖𝘰𝙊𝙤𝙾𝚘𝚶𝛐𝛔𝛰𝜊𝜎𝜪𝝄𝝈𝝤𝝾𝞂𝞞𝞸𝞼𝟎𝟘𝟢𝟬𝟶𞸤𞹤𞺄🯰' },
    { ru: 'п', en: SKIP, twins: 'ΠПℿ∏Ⲡꛛ𝚷𝛱𝜫𝝥𝞟πϖпᴨℼ𝛑𝛡𝜋𝜛𝝅𝝕𝝿𝞏𝞹𝟉' },
    { ru: 'н', en: 'h', twins: 'HʜΗНнᎻᕼℋℌℍⲎꓧꮋＨ𐋏𝐇𝐻𝑯𝓗𝕳𝖧𝗛𝘏𝙃𝙷𝚮𝛨𝜢𝝜𝞖h' },
    { ru: 'р', en: 'p', twins: 'pрPΡРᏢᑭᴘᴩℙⲢꓑꮲＰ𐊕𝐏𝑃𝑷𝒫𝓟𝔓𝕻𝖯𝗣𝘗𝙋𝙿𝚸𝛲𝜬𝝦𝞠pρϱр⍴ⲣｐ𝐩𝑝𝒑𝓅𝓹𝔭𝕡𝖕𝗉𝗽𝘱𝙥𝚙𝛒𝛠𝜌𝜚𝝆𝝔𝞀𝞎𝞺𝟈ÞϷ𐓄pрþƿϸ' },
    { ru: 'т', en: 't', twins: 'тtţƫțᎿŢȚtｔ𝐭𝑡𝒕𝓉𝓽𝔱𝕥𝖙𝗍𝘁𝘵𝙩𝚝TΤτТтᎢᴛ⊤⟙ⲦꓔꭲＴ𐊗𐊱𐌕𑢼𖼊𝐓𝑇𝑻𝒯𝓣𝔗𝕋𝕿𝖳𝗧𝘛𝙏𝚃𝚻𝛕𝛵𝜏𝜯𝝉𝝩𝞃𝞣𝞽🝨' },
    { ru: 'у', en: 'y', twins: 'yɣʏγуүყᶌỿℽꭚｙ𑣜𝐲𝑦𝒚𝓎𝔂𝔶𝕪𝖞𝗒𝘆𝘺𝙮𝚢𝛄𝛾𝜸𝝲𝞬уyyɣʏγуүყᶌỿℽꭚｙ𑣜𝐲𝑦𝒚𝓎𝔂𝔶𝕪𝖞𝗒𝘆𝘺𝙮𝚢𝛄𝛾𝜸𝝲𝞬' },
    { ru: 'ь', en: SKIP, twins: 'bƄЬᏏᑲᖯｂ𝐛𝑏𝒃𝒷𝓫𝔟𝕓𝖇𝖻𝗯𝘣𝙗𝚋' },
    { ru: 'х', en: 'x', twins: 'x×хᕁᕽ᙮ⅹ⤫⤬⨯ｘ𝐱𝑥𝒙𝓍𝔁𝔵𝕩𝖝𝗑𝘅𝘹𝙭𝚡XΧХ᙭ᚷⅩ╳ⲬⵝꓫꞳＸ𐊐𐊴𐌗𐌢𐔧𑣬𝐗𝑋𝑿𝒳𝓧𝔛𝕏𝖃𝖷𝗫𝘟𝙓𝚇𝚾𝛸𝜲𝝬𝞦' },
  ]
};
const REGEX_EN = /[a-z]/g;
const REGEX_RU = /[а-яё]/g;
const REGEX_SPLIT = /[ \-\n!?,.]/g;
const REGEX_EMOJI = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

Object.keys(config.symbols).forEach((key) => {
  config.symbols[key].twins = new RegExp(`[${config.symbols[key].twins}]`, 'gui');
});

// ==============================================
function main(str, _opt = {}) {
  if (!str) return str;
  
  const opt = {
    spaces: true,
    emoji: false
  };
  Object.assign(opt, _opt);

  let res = str;

  if (opt.spaces) res = sanitizeSpaces(res);
  return res;
}

// ==============================================
function sanitize(text, englishTolerance = 0.6) {
  if (!text || typeof text !== 'string') return text;

  // Replace obfuscated emojis that mean something
  const tokens = sanitizeSpaces(sanitizeEmoji(text)).toLowerCase().split(REGEX_SPLIT);

  tokens.forEach((token, idx) => {

    // empty or digit
    if (token.length === 0 || /^\d+$/.test(token)) return;

    // if it's all ru, or all en, or there are it's an ok word
    // assume language of token is RU by default
    const enRatio = (token.match(REGEX_EN)?.length ?? 0) / token.length;
    const ruRatio = (token.match(REGEX_RU)?.length ?? 0) / token.length;
    if (ruRatio === 1 || enRatio === 1) return;

    const tokenLang = (enRatio - ruRatio) > englishTolerance ? 'en' : 'ru';

    config.symbols.forEach((symbol) => {
      if (symbol[tokenLang] === SKIP) return;
      token = token.replace(symbol.twins, symbol[tokenLang]);
    });
    tokens[idx] = token;
  });

  const res = sanitizeSpaces(tokens.join(' '));
  return res;
}

// ==============================================
function sanitizeEmoji(text) {
  let res = text;
  Object.keys(config.emojis).forEach((emoji) => {
    res = res.replaceAll(emoji, config.emojis[emoji]);
  });

  // remove all other emojis
  res = res.replace(REGEX_EMOJI, ' ');
  return res;
}
// ==============================================
function sanitizeSpaces(text) {
  let res = text.trim();

  res = res.replace(/\t/g, ' ');
  res = res.replace(/ {2,}/g, ' ');
  res = res.replace(/^ /gm, '');
  res = res.replace(/ $/gm, '');
  res = res.replace(/\n{3,}/g, '\n\n');
  // res = res.replace(/(?<=[a-z]) ([,.!?])/g, '$1');
  return res;
}

module.exports.sanitize = main;
