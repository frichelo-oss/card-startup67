import crypto from 'crypto';

export default function handler(req, res) {
  const { d, s } = req.query;
  if (!d || !s) return res.status(400).json({ valid: false });

  const SECRET = process.env.APP_SECRET || 'my_super_secret_key_2026';
  const expectedSig = crypto
    .createHmac('sha256', SECRET)
    .update(d)
    .digest('base64url');

  if (s !== expectedSig) {
    return res.status(403).json({ valid: false });
  }

  const decoded = JSON.parse(Buffer.from(d, 'base64url').toString('utf-8'));
  return res.status(200).json({ valid: true, data: decoded });
}