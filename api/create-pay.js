import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, text, mode } = req.body;
  const SECRET = process.env.APP_SECRET || 'my_super_secret_key_2026';

  // 1. Упаковываем данные открытки и подписываем их
  const jsonStr = JSON.stringify({ to, text, mode });
  const encodedData = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedData)
    .digest('base64url');

  const host = req.headers.host;
  const successUrl = `https://${host}/?d=${encodedData}&s=${signature}`;

  // 2. Реквизиты RollyPay из сейфа Vercel
  const terminalId = process.env.ROLLYPAY_MERCHANT_ID || '57ef3da3-a120-4fe7-9d47-24b3c67e077e';
  const apiKey = process.env.ROLLYPAY_API_KEY;
  const amount = '19.00'; // Твоя цена в рублях
  const orderId = `card_${Date.now()}`;

  // Если API-ключ еще не добавлен в Vercel — отдаем открытку сразу (Демо-режим)
  if (!apiKey) {
    return res.status(200).json({ payUrl: successUrl });
  }

  try {
    // 3. Отправляем запрос в RollyPay по их документации
    const response = await fetch('https://api.rollypay.io/api/v1/payments', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terminal_id: terminalId,
        amount: amount,
        payment_currency: 'RUB',
        order_id: orderId,
        success_url: successUrl,
        return_url: successUrl
      })
    });

    const data = await response.json();

    // Ищем ссылку на оплату в ответе от RollyPay
    const finalPayUrl = data.pay_url || (data.data && data.data.pay_url);

    if (finalPayUrl) {
      return res.status(200).json({ payUrl: finalPayUrl });
    } else {
      return res.status(400).json({ error: 'RollyPay error', details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
