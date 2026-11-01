import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, text, mode } = req.body;
  const SECRET = process.env.APP_SECRET || 'my_super_secret_key_2026';

  // 1. Упаковываем данные открытки в Base64URL
  const jsonStr = JSON.stringify({ to, text, mode });
  const encodedData = Buffer.from(jsonStr, 'utf-8').toString('base64url');

  // 2. Создаем защитную подпись, чтобы ссылку нельзя было подделать без оплаты
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedData)
    .digest('base64url');

  // Готовая ссылка, которую получит клиент после успешной оплаты в RollyPay
  const host = req.headers.host;
  const successUrl = `https://${host}/?d=${encodedData}&s=${signature}`;

  // 3. Формируем параметры для кассы RollyPay
  const merchantId = process.env.ROLLYPAY_MERCHANT_ID || 'DEMO_MERCHANT';
  const amount = '49';
  const orderId = `card_${Date.now()}`;

  // Если ключи RollyPay еще не вписаны — сразу отдаем готовую ссылку для теста!
  if (merchantId === 'DEMO_MERCHANT') {
    return res.status(200).json({ payUrl: successUrl });
  }

  // Стандартная ссылка редиректа на кассу RollyPay с возвратом клиента на открытку (success_url)
  const payUrl = `https://rollypay.com/pay?merchant_id=${merchantId}&amount=${amount}&order_id=${orderId}&success_url=${encodeURIComponent(successUrl)}`;

  return res.status(200).json({ payUrl });
}