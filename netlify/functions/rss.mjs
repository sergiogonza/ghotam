const FEEDS = [
  // Geopolitical analysis / conflict monitoring
  { id:'warontherocks', url:'https://warontherocks.com/feed/', category:'geopolitics', priority:5 },
  { id:'crisisgroup', url:'https://www.crisisgroup.org/rss', category:'geopolitics', priority:5 },
  { id:'resurgamhub', url:'https://resurgamhub.org/feed.xml', category:'geopolitics', priority:4 },

  // Broad world coverage — useful for cross-source corroboration
  { id:'bbc-world', url:'https://feeds.bbci.co.uk/news/world/rss.xml', category:'world', priority:4 },
  { id:'guardian-world', url:'https://www.theguardian.com/world/rss', category:'world', priority:4 },
  { id:'aljazeera', url:'https://www.aljazeera.com/xml/rss/all.xml', category:'world', priority:4 },
  { id:'dw', url:'https://rss.dw.com/rdf/rss-en-top', category:'world', priority:4 },
  { id:'un-news', url:'https://news.un.org/feed/subscribe/en/news/all/rss.xml', category:'world', priority:4 },

  // Institutions / policy
  { id:'eu-parliament', url:'https://www.europarl.europa.eu/rss/doc/press-releases/en.xml', category:'institutions', priority:3 },
  { id:'eu-commission', url:'https://ec.europa.eu/commission/presscorner/api/rss?language=en', category:'institutions', priority:3 },
  { id:'uk-bills', url:'https://bills.parliament.uk/rss/allbills.rss', category:'policy', priority:2 },
  { id:'us-bills', url:'https://www.govinfo.gov/rss/bills.xml', category:'policy', priority:2 },
  { id:'fed', url:'https://www.federalreserve.gov/feeds/press_monetary.xml', category:'economics', priority:2 },

  // Cyber / infrastructure security
  { id:'sans', url:'https://isc.sans.edu/rssfeed.xml', category:'cyber', priority:2 },
  { id:'cisa', url:'https://www.cisa.gov/cybersecurity-advisories/all.xml', category:'cyber', priority:2 },

  // High-yield geopolitical aggregations
  { id:'gnews-europe', url:'https://news.google.com/rss/search?q=Ukraine+Russia+NATO+Europe+geopolitics+when:1d&hl=en-US&gl=US&ceid=US:en', category:'geopolitics', priority:4 },
  { id:'gnews-asia', url:'https://news.google.com/rss/search?q=China+Taiwan+South+China+Sea+North+Korea+geopolitics+when:1d&hl=en-US&gl=US&ceid=US:en', category:'geopolitics', priority:4 },
  { id:'gnews-mena', url:'https://news.google.com/rss/search?q=Israel+Iran+Gaza+Lebanon+Syria+Yemen+geopolitics+when:1d&hl=en-US&gl=US&ceid=US:en', category:'geopolitics', priority:4 },
  { id:'gnews-global-south', url:'https://news.google.com/rss/search?q=Sudan+Sahel+DRC+Venezuela+Guyana+geopolitics+when:1d&hl=en-US&gl=US&ceid=US:en', category:'geopolitics', priority:4 }
];

// Specific places first; broad countries later. We only plot when textual evidence exists.
const GEO = [
  { label:'Gaza', country:'Palestinian Territories', lat:31.5017, lng:34.4668, confidence:.96, keys:['gaza','rafah','khan younis'] },
  { label:'West Bank', country:'Palestinian Territories', lat:31.9466, lng:35.3027, confidence:.94, keys:['west bank','ramallah','jenin'] },
  { label:'Taiwan Strait', country:'Taiwan', lat:24.2, lng:119.5, confidence:.96, keys:['taiwan strait'] },
  { label:'South China Sea', country:'South China Sea', lat:12.0, lng:113.0, confidence:.94, keys:['south china sea','spratly','paracel'] },
  { label:'Korean Peninsula', country:'Korean Peninsula', lat:38.3, lng:127.3, confidence:.92, keys:['korean peninsula'] },
  { label:'Kashmir', country:'Kashmir', lat:34.0, lng:76.0, confidence:.94, keys:['kashmir'] },
  { label:'Sahel', country:'Sahel', lat:15.0, lng:2.0, confidence:.86, keys:['sahel'] },
  { label:'Donbas', country:'Ukraine', lat:48.0, lng:37.8, confidence:.96, keys:['donbas','donetsk','luhansk'] },
  { label:'Crimea', country:'Ukraine', lat:45.3, lng:34.0, confidence:.96, keys:['crimea','sevastopol'] },

  { label:'Kyiv', country:'Ukraine', lat:50.4501, lng:30.5234, confidence:.98, keys:['kyiv','kiev'] },
  { label:'Moscow', country:'Russia', lat:55.7558, lng:37.6173, confidence:.98, keys:['moscow','kremlin'] },
  { label:'Beijing', country:'China', lat:39.9042, lng:116.4074, confidence:.98, keys:['beijing'] },
  { label:'Taipei', country:'Taiwan', lat:25.0330, lng:121.5654, confidence:.98, keys:['taipei'] },
  { label:'Tehran', country:'Iran', lat:35.6892, lng:51.3890, confidence:.98, keys:['tehran'] },
  { label:'Jerusalem', country:'Israel', lat:31.7683, lng:35.2137, confidence:.98, keys:['jerusalem'] },
  { label:'Tel Aviv', country:'Israel', lat:32.0853, lng:34.7818, confidence:.98, keys:['tel aviv'] },
  { label:'Beirut', country:'Lebanon', lat:33.8938, lng:35.5018, confidence:.98, keys:['beirut'] },
  { label:'Damascus', country:'Syria', lat:33.5138, lng:36.2765, confidence:.98, keys:['damascus'] },
  { label:'Baghdad', country:'Iraq', lat:33.3152, lng:44.3661, confidence:.98, keys:['baghdad'] },
  { label:'Sanaa', country:'Yemen', lat:15.3694, lng:44.1910, confidence:.98, keys:["sana'a",'sanaa'] },
  { label:'Riyadh', country:'Saudi Arabia', lat:24.7136, lng:46.6753, confidence:.98, keys:['riyadh'] },
  { label:'Doha', country:'Qatar', lat:25.2854, lng:51.5310, confidence:.98, keys:['doha'] },
  { label:'Ankara', country:'Türkiye', lat:39.9334, lng:32.8597, confidence:.98, keys:['ankara'] },
  { label:'Brussels', country:'Belgium', lat:50.8503, lng:4.3517, confidence:.95, keys:['brussels'] },
  { label:'Washington', country:'United States', lat:38.9072, lng:-77.0369, confidence:.96, keys:['washington dc','washington, d.c.','pentagon'] },
  { label:'Pyongyang', country:'North Korea', lat:39.0392, lng:125.7625, confidence:.98, keys:['pyongyang'] },
  { label:'Seoul', country:'South Korea', lat:37.5665, lng:126.9780, confidence:.98, keys:['seoul'] },
  { label:'New Delhi', country:'India', lat:28.6139, lng:77.2090, confidence:.98, keys:['new delhi'] },
  { label:'Islamabad', country:'Pakistan', lat:33.6844, lng:73.0479, confidence:.98, keys:['islamabad'] },
  { label:'Khartoum', country:'Sudan', lat:15.5007, lng:32.5599, confidence:.98, keys:['khartoum'] },
  { label:'Caracas', country:'Venezuela', lat:10.4806, lng:-66.9036, confidence:.98, keys:['caracas'] },

  { label:'Ukraine', country:'Ukraine', lat:48.3794, lng:31.1656, confidence:.84, keys:['ukraine'] },
  { label:'Russia', country:'Russia', lat:61.5240, lng:105.3188, confidence:.82, keys:['russia','russian'] },
  { label:'China', country:'China', lat:35.8617, lng:104.1954, confidence:.82, keys:['china','chinese'] },
  { label:'United States', country:'United States', lat:37.0902, lng:-95.7129, confidence:.78, keys:['united states','u.s.',' us '] },
  { label:'Iran', country:'Iran', lat:32.4279, lng:53.6880, confidence:.84, keys:['iran','iranian'] },
  { label:'Israel', country:'Israel', lat:31.0461, lng:34.8516, confidence:.84, keys:['israel','israeli'] },
  { label:'Lebanon', country:'Lebanon', lat:33.8547, lng:35.8623, confidence:.84, keys:['lebanon','lebanese'] },
  { label:'Syria', country:'Syria', lat:34.8021, lng:38.9968, confidence:.84, keys:['syria','syrian'] },
  { label:'Iraq', country:'Iraq', lat:33.2232, lng:43.6793, confidence:.84, keys:['iraq','iraqi'] },
  { label:'Yemen', country:'Yemen', lat:15.5527, lng:48.5164, confidence:.84, keys:['yemen','yemeni','houthi'] },
  { label:'Saudi Arabia', country:'Saudi Arabia', lat:23.8859, lng:45.0792, confidence:.84, keys:['saudi arabia','saudi'] },
  { label:'Qatar', country:'Qatar', lat:25.3548, lng:51.1839, confidence:.84, keys:['qatar'] },
  { label:'Türkiye', country:'Türkiye', lat:38.9637, lng:35.2433, confidence:.84, keys:['turkiye','türkiye','turkey','turkish'] },
  { label:'Taiwan', country:'Taiwan', lat:23.6978, lng:120.9605, confidence:.86, keys:['taiwan','taiwanese'] },
  { label:'North Korea', country:'North Korea', lat:40.3399, lng:127.5101, confidence:.86, keys:['north korea','dprk'] },
  { label:'South Korea', country:'South Korea', lat:35.9078, lng:127.7669, confidence:.86, keys:['south korea'] },
  { label:'Japan', country:'Japan', lat:36.2048, lng:138.2529, confidence:.84, keys:['japan','japanese'] },
  { label:'India', country:'India', lat:20.5937, lng:78.9629, confidence:.84, keys:['india','indian'] },
  { label:'Pakistan', country:'Pakistan', lat:30.3753, lng:69.3451, confidence:.84, keys:['pakistan','pakistani'] },
  { label:'Afghanistan', country:'Afghanistan', lat:33.9391, lng:67.7100, confidence:.84, keys:['afghanistan','afghan','taliban'] },
  { label:'Myanmar', country:'Myanmar', lat:21.9162, lng:95.9560, confidence:.84, keys:['myanmar','burma'] },
  { label:'Philippines', country:'Philippines', lat:12.8797, lng:121.7740, confidence:.84, keys:['philippines','philippine'] },
  { label:'Sudan', country:'Sudan', lat:12.8628, lng:30.2176, confidence:.86, keys:['sudan','sudanese'] },
  { label:'DR Congo', country:'DR Congo', lat:-4.0383, lng:21.7587, confidence:.84, keys:['democratic republic of congo','dr congo','drc','congolese'] },
  { label:'Mali', country:'Mali', lat:17.5707, lng:-3.9962, confidence:.84, keys:['mali','malian'] },
  { label:'Niger', country:'Niger', lat:17.6078, lng:8.0817, confidence:.84, keys:['niger','nigerien'] },
  { label:'Burkina Faso', country:'Burkina Faso', lat:12.2383, lng:-1.5616, confidence:.84, keys:['burkina faso'] },
  { label:'Venezuela', country:'Venezuela', lat:6.4238, lng:-66.5897, confidence:.84, keys:['venezuela','venezuelan'] },
  { label:'Guyana', country:'Guyana', lat:4.8604, lng:-58.9302, confidence:.84, keys:['guyana','guyanese','essequibo'] },
  { label:'Armenia', country:'Armenia', lat:40.0691, lng:45.0382, confidence:.84, keys:['armenia','armenian'] },
  { label:'Azerbaijan', country:'Azerbaijan', lat:40.1431, lng:47.5769, confidence:.84, keys:['azerbaijan','azerbaijani'] },
  { label:'Georgia', country:'Georgia', lat:42.3154, lng:43.3569, confidence:.78, keys:['georgia','tbilisi'] },
  { label:'Moldova', country:'Moldova', lat:47.4116, lng:28.3699, confidence:.84, keys:['moldova','moldovan','transnistria'] },
  { label:'Belarus', country:'Belarus', lat:53.7098, lng:27.9534, confidence:.84, keys:['belarus','belarusian'] },
  { label:'Poland', country:'Poland', lat:51.9194, lng:19.1451, confidence:.82, keys:['poland','polish'] },
  { label:'United Kingdom', country:'United Kingdom', lat:55.3781, lng:-3.4360, confidence:.80, keys:['united kingdom','britain','british'] },
  { label:'France', country:'France', lat:46.2276, lng:2.2137, confidence:.80, keys:['france','french'] },
  { label:'Germany', country:'Germany', lat:51.1657, lng:10.4515, confidence:.80, keys:['germany','german'] }
];

const ACTORS = {
  China:['china','beijing','pla','ccp'],
  Russia:['russia','kremlin','moscow'],
  USA:['united states','washington dc','pentagon','u.s.'],
  Iran:['iran','tehran','irgc'],
  NATO:['nato','north atlantic treaty organization'],
  EU:['european union','eu commission','european council','brussels'],
  Israel:['israel','idf'],
  Taiwan:['taiwan','taipei'],
  Ukraine:['ukraine','kyiv'],
  NorthKorea:['north korea','pyongyang','dprk'],
  Hamas:['hamas'],
  Hezbollah:['hezbollah'],
  Houthis:['houthi','ansar allah'],
  Taliban:['taliban'],
  India:['india','new delhi'],
  Pakistan:['pakistan','islamabad']
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
  if (start === -1) { start = tagText.indexOf(singleQuoted); quote = "'"; }
  if (start === -1) return '';

  start += attrName.length + 2;
  const end = tagText.indexOf(quote, start);
  return end === -1 ? '' : tagText.slice(start, end);
}

function severity(text) {
  let s = 1;
  if (/war|attack|strike|conflict|invasion|offensive|missile|drone strike/i.test(text)) s += 4;
  if (/nuclear|radiological/i.test(text)) s += 3;
  if (/coup|mobilization|blockade|ceasefire collapse|martial law/i.test(text)) s += 2;
  if (/cyber|malware|ransomware|critical infrastructure/i.test(text)) s += 2;
  if (/sanction|embargo|tariff|export control/i.test(text)) s += 1;
  return Math.min(10, s);
}

function detectLocations(text) {
  const t = (' ' + text.toLowerCase() + ' ');
  const found = [];
  for (const place of GEO) {
    if (place.keys.some((k) => t.includes(k.toLowerCase()))) found.push(place);
  }
  return found.slice(0, 6);
}

function actors(text) {
  const t = text.toLowerCase();
  return Object.entries(ACTORS)
    .filter(([, keys]) => keys.some((k) => t.includes(k)))
    .map(([actor]) => actor);
}

function parseChunks(xml) {
  const rss = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => ({ raw:m[0], atom:false }));
  const atom = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => ({ raw:m[0], atom:true }));
  return rss.length ? rss : atom;
}

function parseItems(xml, feed) {
  return parseChunks(xml).slice(0, 35).map(({ raw, atom }) => {
    const title = clean(getTag(raw, 'title'));
    const description = clean(
      getTag(raw, 'description') ||
      getTag(raw, 'summary') ||
      getTag(raw, 'content')
    );
    const link = clean(getTag(raw, 'link')) || getAttribute(raw, 'link', 'href');
    const pubDate = clean(
      getTag(raw, 'pubDate') ||
      getTag(raw, 'published') ||
      getTag(raw, 'updated')
    ) || new Date().toISOString();

    const image =
      getAttribute(raw, 'media:content', 'url') ||
      getAttribute(raw, 'media:thumbnail', 'url') ||
      getAttribute(raw, 'enclosure', 'url') ||
      '';

    const text = title + ' ' + description;
    const locations = detectLocations(text);
    const primary = locations[0] || null;
    const foundActors = actors(text);
    const sev = severity(text);
    const geopolitical = feed.category === 'geopolitics' || foundActors.length > 0 || locations.length > 0;
    const interestScore = Math.min(100,
      feed.priority * 10 +
      sev * 4 +
      Math.min(foundActors.length, 4) * 5 +
      (primary ? Math.round(primary.confidence * 10) : 0) +
      (geopolitical ? 10 : 0)
    );

    return {
      id: Buffer.from(feed.id + '|' + link + '|' + title).toString('base64url').slice(0, 44),
      title,
      description: description.slice(0, 900),
      link,
      source: new URL(feed.url).hostname,
      feedId: feed.id,
      category: feed.category,
      priority: feed.priority,
      publishedAt: pubDate,
      image,
      lat: primary?.lat,
      lng: primary?.lng,
      country: primary?.country,
      locationLabel: primary?.label,
      geoConfidence: primary?.confidence || 0,
      locations: locations.map((p) => ({ label:p.label, country:p.country, lat:p.lat, lng:p.lng, confidence:p.confidence })),
      actors: foundActors,
      tags: geopolitical ? ['geopolitics'] : [feed.category],
      severity: sev,
      interestScore,
      format: atom ? 'atom' : 'rss'
    };
  }).filter((event) => event.title && event.link);
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(feed.url, {
      headers: { 'user-agent': 'Ghotam-Live-OSINT/2.0 (+public RSS aggregation)' },
      signal: controller.signal
    });
    if (!response.ok) return { feed:feed.id, ok:false, status:response.status, events:[] };
    const xml = await response.text();
    return { feed:feed.id, ok:true, status:response.status, events:parseItems(xml, feed) };
  } catch {
    return { feed:feed.id, ok:false, status:0, events:[] };
  } finally {
    clearTimeout(timer);
  }
}

export async function handler() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const dedupe = new Map();

  for (const result of results) {
    for (const event of result.events) {
      const key = (event.link || event.title).toLowerCase().replace(/[#?].*$/, '');
      const existing = dedupe.get(key);
      if (!existing || event.interestScore > existing.interestScore) dedupe.set(key, event);
    }
  }

  const all = [...dedupe.values()];
  all.sort((a, b) => {
    const score = (b.interestScore || 0) - (a.interestScore || 0);
    if (score !== 0) return score;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const feedStatus = results.map((r) => ({ id:r.feed, ok:r.ok, status:r.status, count:r.events.length }));

  return {
    statusCode:200,
    headers:{
      'content-type':'application/json',
      'access-control-allow-origin':'*',
      'cache-control':'public, max-age=60'
    },
    body:JSON.stringify({
      updatedAt:new Date().toISOString(),
      feedCount:FEEDS.length,
      feedStatus,
      mappedCount:all.filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number').length,
      geopoliticalCount:all.filter((e) => e.tags?.includes('geopolitics')).length,
      events:all.slice(0, 300)
    })
  };
}
