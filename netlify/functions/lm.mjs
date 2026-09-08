export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'POST only' }) };
  }

  const baseUrl = (process.env.LM_BASE_URL || '').replace(/\/$/, '');
  const model = process.env.LM_MODEL || 'minicpm5-1b';
  const apiKey = process.env.LM_API_KEY || '';

  if (!baseUrl) {
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'LM_BASE_URL is not configured on Netlify. The cloud deployment cannot access localhost:1234 on your PC.'
      })
    };
  }

  try {
    const input = JSON.parse(event.body || '{}');
    const messages = Array.isArray(input.messages) ? input.messages : [];
    if (!messages.length) {
      return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'messages is required' }) };
    }

    const headers = { 'content-type': 'application/json' };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: input.model || model,
        messages,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.max_tokens ?? 600,
        stream: false
      })
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: String(error) })
    };
  }
}
