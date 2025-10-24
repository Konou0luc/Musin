import { registerUser } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  try {
    const { email, password } = await readJsonBody(req);
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }
    const user = await registerUser({ email, password });
    return res.status(201).json({ user });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ error: e.message || 'Erreur serveur' });
  }
}
