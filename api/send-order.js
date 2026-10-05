/**
 * POST /api/send-order — принимает заявку на расчёт из корзины (см.
 * assets/js/main.js, обработчик формы data-cart-form) и отправляет её
 * в Telegram-чат отдела продаж. Serverless-функция Vercel: любой файл
 * в api/ становится отдельным эндпоинтом автоматически, отдельного
 * роутера не нужно.
 *
 * Секреты (токен бота и id чата) — только в переменных окружения (см.
 * .env.example и README): в браузер и в код репозитория они не попадают.
 */
'use strict';

var telegramTemplate = require('../lib/telegram-template');

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Сколько ждать ответа Telegram на одну попытку. Две попытки с запасом
// укладываются в лимит времени функции на Vercel: иначе зависший запрос
// обрывался бы платформой, клиент видел бы ошибку и отправлял заявку снова.
var TELEGRAM_TIMEOUT_MS = 4000;
var RETRY_DELAY_MS = 800;

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

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

/** Одна попытка отправки через Telegram Bot API — обычный HTTPS POST,
 *  библиотека не нужна. Бросает исключение при неуспехе; у ошибки флаг
 *  `retry` — имеет ли смысл повторить (сбой сети, 429, 5xx). */
async function sendTelegramOnce(text) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  var resp;
  try {
    resp = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS)
    });
  } catch (e) {
    var err = new Error('telegram: ' + (e && e.name === 'TimeoutError' ? 'timeout' : (e && e.message)));
    // По таймауту не повторяем: Telegram мог уже принять сообщение, и
    // повтор дал бы менеджеру дубль заявки.
    err.retry = !(e && e.name === 'TimeoutError');
    throw err;
  }
  var json = null;
  try { json = await resp.json(); } catch (e) { /* тело не JSON — json останется null */ }
  if (!resp.ok || !json || !json.ok) {
    var fail = new Error('telegram: ' + (json && json.description ? json.description : resp.status));
    fail.retry = resp.status === 429 || resp.status >= 500;
    throw fail;
  }
}

/** Отправка с одной повторной попыткой при временном сбое. */
async function sendTelegramMessage(text) {
  try {
    await sendTelegramOnce(text);
  } catch (e) {
    if (!e.retry) throw e;
    console.error('send-order: временный сбой, повторяем', e);
    await wait(RETRY_DELAY_MS);
    await sendTelegramOnce(text);
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

  // Строки корзины — только то, что реально идёт в сообщение; сумма и цена
  // уже посчитаны на клиенте (та же логика, что рисует таблицу в корзине),
  // здесь пересчитывать их незачем — это заявка на расчёт, а не платёж,
  // и итоговую цену в любом случае подтверждает менеджер.
  var cart = cartIn.map(function (item) {
    return {
      name: sanitize(item && item.name, 200),
      cat: sanitize(item && item.cat, 80),
      size: sanitize(item && item.size, 40),
      qty: Math.max(0, Math.round(Number(item && item.qty) || 0)),
      unit: sanitize(item && item.unit, 10) || 'шт.',
      price: item && item.ask ? null : sanitize(item && item.price, 40),
      ask: !!(item && item.ask),
      lineSum: item && item.ask ? 0 : Math.max(0, Number(item && item.lineSum) || 0)
    };
  });
  var sum = Math.max(0, Number(body.sum) || 0);
  var asksCount = Math.max(0, Math.round(Number(body.asksCount) || 0));

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    // Так молча не «теряем» заявку: любой, кто откроет логи функции,
    // сразу увидит, что заявка не ушла из-за настроек, а не из-за клиента.
    console.error('send-order: не настроен Telegram — проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в переменных окружения');
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

  try {
    await sendTelegramMessage(telegramTemplate.buildOrderTelegramMessage(data));
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('send-order: Telegram не доставил заявку', e);
    res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
