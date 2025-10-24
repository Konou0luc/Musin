export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    const err = new Error('Content-Type doit être application/json');
    err.status = 415;
    throw err;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (_e) {
    const err = new Error('JSON invalide');
    err.status = 400;
    throw err;
  }
}

export function sendJson(res, status, data) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
