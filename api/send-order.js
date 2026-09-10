/**
 * POST /api/send-order — принимает заявку на расчёт из корзины (см.
 * assets/js/main.js, обработчик формы data-cart-form) и письмом уходит
 * администратору. Serverless-функция Vercel: любой файл в api/ становится
 * отдельным эндпоинтом автоматически, отдельного роутера не нужно.
 *
 * Секреты (SMTP-логин/пароль, адрес администратора) — только в переменных
 * окружения (см. .env.example и README): в браузер и в код репозитория
 * они никогда не попадают.
 */
'use strict';

var nodemailer = require('nodemailer');
var emailTemplate = require('../lib/email-template');

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

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Так молча не «теряем» заявку в логах: любой, кто откроет логи
    // функции, сразу увидит, что письмо не ушло из-за настроек, а не
    // из-за ошибки клиента.
    console.error('send-order: SMTP не настроен — проверьте SMTP_HOST/SMTP_USER/SMTP_PASS в переменных окружения');
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

  try {
    var transporter = getTransporter();
    await transporter.sendMail({
      from: '"Арт-Пак Плюс — сайт" <' + process.env.SMTP_USER + '>',
      to: process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL,
      replyTo: email || undefined,
      subject: subject,
      html: emailTemplate.buildOrderEmailHtml(data),
      text: emailTemplate.buildOrderEmailText(data)
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-order: ошибка отправки письма', err);
    res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
