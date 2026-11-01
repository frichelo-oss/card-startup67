import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, text, mode } = req.body;
  const SECRET = process.env.APP_SECRET || 'my_super_secret_key_2026';

  // 1. Шифруем открытку
  const jsonStr = JSON.stringify({ to, text, mode });
  const encodedData = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedData)
    .digest('base64url');

  const host = req.headers.host;
  const successUrl = `https://${host}/?d=${encodedData}&s=${signature}`;

  // 2. Берем ключи из сейфа Vercel (и убираем случайные пробелы по краям через .trim())
  const terminalId = (process.env.ROLLYPAY_MERCHANT_ID || '57ef3da3-a120-4fe7-9d47-24b3c67e077e').trim();
  const apiKey = process.env.ROLLYPAY_API_KEY ? process.env.ROLLYPAY_API_KEY.trim() : '';

  if (!apiKey) {
    return res.status(400).json({ error: 'В Vercel не найден ключ ROLLYPAY_API_KEY (или не сделан Redeploy)' });
  }

  try {
    // 3. Строго те 4 поля, которые указаны в Быстром старте RollyPay
    const response = await fetch('https://api.rollypay.io/api/v1/payments', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terminal_id: terminalId,
        amount: '100.00',
        payment_currency: 'RUB',
        order_id: `order_${Date.now()}`
      })
    });

    const data = await response.json();
    const finalPayUrl = data.pay_url || (data.data && data.data.pay_url) || data.url;

    if (response.ok && finalPayUrl) {
      return res.status(200).json({ payUrl: finalPayUrl, cardUrl: successUrl });
    } else {
      return res.status(400).json({ error: 'Ответ RollyPay', details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
