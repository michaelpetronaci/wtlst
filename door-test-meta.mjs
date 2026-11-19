// Server-rendered social metadata for shareable Door Test result URLs.
// No visitor identifiers, cookies, requests to external systems, or admission effects.
export const resultMeta = Object.freeze({
  instigator: {
    title: "I'm The Instigator — WTLST Door Test",
    description: "I would invite the person who challenges the room. Who would you let in? Take the three-question WTLST Door Test."
  },
  connector: {
    title: "I'm The Connector — WTLST Door Test",
    description: "I would make room for the person who brings people together. Who would you let in? Take the WTLST Door Test."
  },
  builder: {
    title: "I'm The Builder — WTLST Door Test",
    description: "I would invite the person who makes things happen. Who would you let in? Take the three-question WTLST Door Test."
  },
  wildcard: {
    title: "I'm The Wildcard — WTLST Door Test",
    description: "I would invite the person nobody expected. Who would you let in? Take the three-question WTLST Door Test."
  }
});
function escapeAttr(text) {
  return text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function substitute(html, needle, replacement) {
  if (!html.includes(needle)) throw new Error('Door Test template missing expected social metadata');
  return html.replace(needle, replacement);
}
export function renderDoorTest(html, resultId) {
  if (!Object.prototype.hasOwnProperty.call(resultMeta, resultId)) return html;
  const data = resultMeta[resultId];
  const title = escapeAttr(data.title), description = escapeAttr(data.description);
  const socialUrl = 'https://www.thewtlst.com/the-test?result=' + resultId;
  const tag = (key, value, attr='property') => '<meta ' + attr + '="' + key + '" content="' + value + '">';
  html = substitute(html, '<title>The Door Test — WTLST</title>', '<title>' + title + '</title>');
  html = substitute(html, '<meta property="og:title" content="Would you let yourself in? — The Door Test">', tag('og:title',title));
  html = substitute(html, '<meta property="og:description" content="Three choices. One uncomfortable answer. Find out what kind of person you\'d invite.">', tag('og:description',description));
  html = substitute(html, '<meta property="og:url" content="https://www.thewtlst.com/the-test">', tag('og:url',socialUrl));
  html = substitute(html, '<meta name="twitter:title" content="Would you let yourself in? — The Door Test">', tag('twitter:title',title,'name'));
  html = substitute(html, '<meta name="twitter:description" content="Three choices. One uncomfortable answer. Find out who you would invite.">', tag('twitter:description',description,'name'));
  return html;
}
