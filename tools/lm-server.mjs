import http from 'node:http';

const LM_BASE_URL = (process.env.LM_BASE_URL || 'http://127.0.0.1:1234/v1').replace(/\/$/, '');
const LM_MODEL = process.env.LM_MODEL || 'minicpm5-1b';

const server = http.createServer(async (req, res) => {
  if (req.url !== '/api/lm' || req.method !== 'POST') {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const input = JSON.parse(body || '{}');
    const response = await fetch(`${LM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: input.model || LM_MODEL,
        messages: input.messages || [],
        temperature: input.temperature ?? 0.2,
        max_tokens: input.max_tokens ?? 600,
        stream: false
      })
    });

    const text = await response.text();
    res.writeHead(response.status, {
      'content-type': response.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*'
    });
    res.end(text);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(error) }));
  }
});

server.listen(8789, '127.0.0.1', () => {
  console.log(`LM bridge http://127.0.0.1:8789/api/lm -> ${LM_BASE_URL}`);
});
