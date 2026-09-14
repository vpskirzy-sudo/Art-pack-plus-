/**
 * POST /api/send-order — принимает заявку на расчёт из корзины (см.
 * assets/js/main.js, обработчик формы data-cart-form) и рассылает её
 * менеджеру: в Telegram-бота и письмом. Serverless-функция Vercel: любой
 * файл в api/ становится отдельным эндпоинтом автоматически, отдельного
 * роутера не нужно.
 *
 * Секреты (токен Telegram-бота, SMTP-логин/пароль, адрес администратора) —
 * только в переменных окружения (см. .env.example и README): в браузер и
 * в код репозитория они никогда не попадают. Каналы независимы: если
 * настроен только Telegram или только почта — заявка уходит туда, куда
 * настроена; отказавший канал не должен «терять» заявку целиком, пока
 * хотя бы один настроенный канал доставил её.
 */
'use strict';

var nodemailer = require('nodemailer');
var emailTemplate = require('../lib/email-template');
var telegramTemplate = require('../lib/telegram-template');

var DEFAULT_ADMIN_EMAIL = 'vps.kirzis@gmail.com';

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max);
}

function readJsonBody(req) {
  // Vercel обычно уже распарсил JSON в req.body, но подстрахуемся на
  // случай текстового/пустого тела — иначе одна нетипичная заявка
  // роняла бы всю функцию необработанным исключением.
  var body = req.body;
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string' && body.trim()) {
    try { return JSON.parse(body); } catch (e) { return {}; }
  }
  return {};
}

// Транспорт создаём один раз и переиспользуем между вызовами: контейнер
// serverless-функции обычно живёт дольше одного запроса («тёплый старт»),
// а на новое TCP-соединение к SMTP уходит куда больше времени, чем на сам
// вызов sendMail.
var cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  var port = Number(process.env.SMTP_PORT) || 465;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return cachedTransporter;
}

/** Отправка сообщения через Telegram Bot API — обычный HTTPS POST,
 *  библиотека не нужна. Бросает исключение при неуспехе — вызывающий код
 *  сам решает, что делать со сбоем одного из каналов. */
async function sendTelegramMessage(text) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  var resp = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  var json = null;
  try { json = await resp.json(); } catch (e) { /* тело не JSON — json останется null */ }
  if (!resp.ok || !json || !json.ok) {
    throw new Error('telegram: ' + (json && json.description ? json.description : resp.status));
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  var body = readJsonBody(req);

  // Honeypot: скрытое от человека поле формы (см. src/korzina.html и
  // style.css .field--trap). Простые боты заполняют вообще все поля
  // формы — заполненное значение здесь выдаёт бота. Отвечаем «успехом»,
  // чтобы не подсказывать, по какому именно признаку его отфильтровали.
  if (sanitize(body.company, 200)) {
    res.status(200).json({ ok: true });
    return;
  }

  var name = sanitize(body.name, 120);
  var phone = sanitize(body.phone, 40);
  var email = sanitize(body.email, 160);
  var comment = sanitize(body.comment, 2000);
  var cartIn = Array.isArray(body.cart) ? body.cart.slice(0, 100) : [];

  var fields = {};
  if (!name) fields.name = 'Укажите, пожалуйста, имя';
  if (!phone || phone.replace(/\D/g, '').length < 7) fields.phone = 'Укажите телефон для связи';
  if (email && !EMAIL_RE.test(email)) fields.email = 'Проверьте адрес электронной почты';

  if (Object.keys(fields).length) {
    res.status(400).json({ ok: false, error: 'validation', fields: fields });
    return;
  }

  // Строки корзины — только то, что реально идёт в письмо; сумма и цена
  // уже посчитаны на клиенте (та же логика, что рисует таблицу в корзине),
  // здесь пересчитывать их незачем — это заявка на расчёт, а не платёж,
  // и итоговую цену в любом случае подтверждает менеджер.
  var cart = cartIn.map(function (item) {
    return {
      name: sanitize(item && item.name, 200),
      cat: sanitize(item && item.cat, 80),
      size: sanitize(item && item.size, 40),
      qty: Math.max(0, Math.round(Number(item && item.qty) || 0)),
      price: item && item.ask ? null : sanitize(item && item.price, 40),
      ask: !!(item && item.ask),
      lineSum: item && item.ask ? 0 : Math.max(0, Number(item && item.lineSum) || 0)
    };
  });
  var sum = Math.max(0, Number(body.sum) || 0);
  var asksCount = Math.max(0, Math.round(Number(body.asksCount) || 0));

  var telegramConfigured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  var emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!telegramConfigured && !emailConfigured) {
    // Так молча не «теряем» заявку в логах: любой, кто откроет логи
    // функции, сразу увидит, что заявка не ушла из-за настроек, а не
    // из-за ошибки клиента.
    console.error('send-order: не настроен ни один канал — проверьте TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID или SMTP_HOST/SMTP_USER/SMTP_PASS в переменных окружения');
    res.status(500).json({ ok: false, error: 'server_not_configured' });
    return;
  }

  var now = new Date();
  var dateStr;
  try {
    dateStr = now.toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', dateStyle: 'long', timeStyle: 'short' });
  } catch (e) {
    dateStr = now.toISOString();
  }

  var data = { name: name, phone: phone, email: email, comment: comment, cart: cart, sum: sum, asksCount: asksCount, dateStr: dateStr };
  var subject = '[Заказы Артпак+] Новый расчёт от ' + name + ' — ' + phone;

  var jobs = [];
  if (telegramConfigured) {
    jobs.push(sendTelegramMessage(telegramTemplate.buildOrderTelegramMessage(data))
      .then(function () { return { channel: 'telegram', ok: true }; })
      .catch(function (err) { return { channel: 'telegram', ok: false, err: err }; }));
  }
  if (emailConfigured) {
    var transporter = getTransporter();
    jobs.push(transporter.sendMail({
      from: '"Арт-Пак Плюс — сайт" <' + process.env.SMTP_USER + '>',
      to: process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
      replyTo: email || undefined,
      subject: subject,
      html: emailTemplate.buildOrderEmailHtml(data),
      text: emailTemplate.buildOrderEmailText(data)
    }).then(function () { return { channel: 'email', ok: true }; })
      .catch(function (err) { return { channel: 'email', ok: false, err: err }; }));
  }

  var results = await Promise.all(jobs);
  results.filter(function (r) { return !r.ok; }).forEach(function (r) {
    console.error('send-order: канал «' + r.channel + '» не доставил заявку', r.err);
  });

  // Успех — если доставил хотя бы один настроенный канал: неполадка с
  // одним из них не должна превращать реальную заявку клиента в ошибку 502.
  if (results.some(function (r) { return r.ok; })) {
    res.status(200).json({ ok: true });
  } else {
    res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
