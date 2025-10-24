import Busboy from 'busboy';
import { requireAuth } from '../lib/auth.js';

const AUDD_API_TOKEN = process.env.AUDD_API_TOKEN;

export const config = {
  api: {
    bodyParser: false
  }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 12 * 1024 * 1024 } });
    const fields = {};
    let fileBuffer = Buffer.alloc(0);

    busboy.on('file', (name, file, _info) => {
      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
      });
      file.on('limit', () => reject(new Error('Fichier trop volumineux')));
    });
    busboy.on('field', (name, val) => {
      fields[name] = val;
    });
    busboy.on('finish', () => resolve({ fields, fileBuffer }));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  try {
    requireAuth(req);
    if (!AUDD_API_TOKEN) {
      return res.status(500).json({ error: 'AUDD_API_TOKEN non configuré' });
    }

    const { fileBuffer } = await parseMultipart(req);
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const form = new FormData();
    form.append('api_token', AUDD_API_TOKEN);
    form.append('return', 'timecode,apple_music,spotify');
    form.append('file', new Blob([fileBuffer]), 'audio.wav');

    const auddRes = await fetch('https://api.audd.io/', { method: 'POST', body: form });
    const data = await auddRes.json();

    return res.status(200).json(data);
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Erreur reconnaissance' });
  }
}
