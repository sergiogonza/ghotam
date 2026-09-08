const FEEDS = [
  'https://isc.sans.edu/rssfeed.xml',
  'https://warontherocks.com/feed/',
  'https://www.cisa.gov/cybersecurity-advisories/all.xml',
  'https://www.europarl.europa.eu/rss/doc/press-releases/en.xml',
  'https://bills.parliament.uk/rss/allbills.rss',
  'https://www.federalreserve.gov/feeds/press_monetary.xml'
];

const GEO = [
  { country:'China', lat:35.8617, lng:104.1954, keys:['china','beijing'] },
  { country:'Russia', lat:61.5240, lng:105.3188, keys:['russia','moscow','kremlin'] },
  { country:'United States', lat:37.0902, lng:-95.7129, keys:['united states','washington','pentagon','u.s.'] },
  { country:'Iran', lat:32.4279, lng:53.6880, keys:['iran','tehran'] },
  { country:'Israel', lat:31.0461, lng:34.8516, keys:['israel','tel aviv'] },
  { country:'United Kingdom', lat:55.3781, lng:-3.4360, keys:['united kingdom','britain','london'] },
  { country:'Taiwan', lat:23.6978, lng:120.9605, keys:['taiwan','taipei'] },
  { country:'Ukraine', lat:48.3794, lng:31.1656, keys:['ukraine','kyiv'] }
];

const ACTORS = {
  China:['china','beijing','pla','ccp'],
  Russia:['russia','kremlin','moscow'],
  USA:['united states','washington','pentagon','u.s.'],
  Iran:['iran','tehran','irgc'],
  NATO:['nato'],
  EU:['european union','brussels'],
  Israel:['israel','idf'],
  Taiwan:['taiwan'],
  Ukraine:['ukraine','kyiv']
};

const clean = (s) => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

function getTag(xml, name) {
  const open = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i');
  const match = xml.match(open);
  return match ? match[1] : '';
}

function getAttribute(xml, tagName, attrName) {
  const tagRegex = new RegExp('<' + tagName.replace(':', '\\:') + '\\b[^>]*>', 'i');
  const tagMatch = xml.match(tagRegex);
  if (!tagMatch) return '';

  const tagText = tagMatch[0];
  const doubleQuoted = attrName + '="';
  const singleQuoted = attrName + "='";

  let start = tagText.indexOf(doubleQuoted);
  let quote = '"';

  if (start === -1) {
    start = tagText.indexOf(singleQuoted);
    quote = "'";
  }

  if (start === -1) return '';

  start += attrName.length + 2;
  const end = tagText.indexOf(quote, start);
  if (end === -1) return '';

  return tagText.slice(start, end);
}

function severity(text) {
  let s = 1;
  if (/war|attack|strike|conflict/i.test(text)) s += 4;
  if (/nuclear/i.test(text)) s += 3;
  if (/cyber|malware|ransomware/i.test(text)) s += 2;
  if (/sanction/i.test(text)) s += 1;
  return Math.min(10, s);
}

function geo(text) {
  const t = text.toLowerCase();
  for (const g of GEO) {
    if (g.keys.some((k) => t.includes(k))) return g;
  }
  return null;
}

function actors(text) {
  const t = text.toLowerCase();
  return Object.entries(ACTORS)
    .filter(([, keys]) => keys.some((k) => t.includes(k)))
    .map(([actor]) => actor);
}

function parseItems(xml, feedUrl) {
  const chunks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);

  return chunks.slice(0, 25).map((item) => {
    const title = clean(getTag(item, 'title'));
    const description = clean(getTag(item, 'description'));
    const link = clean(getTag(item, 'link'));
    const pubDate = clean(getTag(item, 'pubDate')) || new Date().toISOString();

    const image =
      getAttribute(item, 'media:content', 'url') ||
      getAttribute(item, 'media:thumbnail', 'url') ||
      getAttribute(item, 'enclosure', 'url') ||
      '';

    const text = title + ' ' + description;
    const location = geo(text);

    return {
      id: Buffer.from(feedUrl + '|' + link + '|' + title)
        .toString('base64url')
        .slice(0, 40),
      title,
      description: description.slice(0, 700),
      link,
      source: new URL(feedUrl).hostname,
      publishedAt: pubDate,
      image,
      lat: location?.lat,
      lng: location?.lng,
      country: location?.country,
      actors: actors(text),
      tags: [],
      severity: severity(text)
    };
  }).filter((event) => event.title);
}

export async function handler() {
  const all = [];

  for (const url of FEEDS) {
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Ghotam-RSS/1.0' }
      });

      if (!response.ok) continue;

      const xml = await response.text();
      all.push(...parseItems(xml, url));
    } catch {
      // Keep processing remaining feeds.
    }
  }

  all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=60'
    },
    body: JSON.stringify({
      updatedAt: new Date().toISOString(),
      events: all.slice(0, 120)
    })
  };
}
