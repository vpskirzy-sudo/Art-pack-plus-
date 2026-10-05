/**
 * Сообщение с заявкой на расчёт для Telegram-бота отдела продаж.
 * Числа приходят уже посчитанными с клиента, здесь только форматирование
 * и экранирование пользовательского ввода — сообщение уходит в Telegram
 * с parse_mode "HTML", поэтому чужой текст (имя, комментарий) экранируется.
 *
 * Порядок: клиент → позиции «по запросу» (их менеджеру считать) →
 * позиции с ценой по прайсу и итог. Нумерация сквозная, чтобы по телефону
 * можно было сослаться на «позицию 3».
 *
 * Telegram не принимает сообщения длиннее 4096 символов — если состав
 * заказа большой, лишние позиции с конца не попадают в сообщение, а вместо
 * них стоит пометка, сколько не поместилось.
 */
'use strict';

var TG_TEXT_LIMIT = 4096;
var RULE = '━━━━━━━━━━━━━━━━━━';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 12500 → «12 500» (неразрывный пробел между разрядами). */
function num(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function money(n) {
  n = Number(n) || 0;
  var parts = n.toFixed(2).split('.');
  return num(parts[0]) + ',' + parts[1] + ' руб.';
}

/** Блок одной позиции: имя жирным, под ним — детали одной строкой. */
function itemBlock(item, n) {
  var unit = esc(item.unit || 'шт.');
  var details = [];
  if (item.cat) details.push(esc(item.cat));
  // Размер отдельно — только если его нет в названии позиции.
  if (item.size && String(item.name || '').indexOf(item.size) === -1) {
    details.push('размер ' + esc(item.size));
  }
  var qty = num(item.qty) + ' ' + unit;
  var line = item.ask
    ? qty
    : qty + ' × ' + esc(item.price) + ' = <b>' + money(item.lineSum) + '</b>';
  details.push(line);
  return '<b>' + n + '.</b> ' + esc(item.name || '—') + '\n' +
         '      <i>' + details.join(' · ') + '</i>';
}

/** Сообщение целиком для заданных списков позиций. */
function compose(head, asks, priced, sum, hidden) {
  var out = head.slice();
  var n = 0;

  if (!asks.length && !priced.length && !hidden) {
    out.push('', RULE, '🛒 <i>Без позиций из корзины — только контакты и комментарий.</i>');
    return out.join('\n');
  }

  if (asks.length) {
    out.push('', RULE, '❓ <b>ЦЕНА ПО ЗАПРОСУ</b> · ' + asks.length + ' поз.', '');
    asks.forEach(function (it, i) {
      if (i) out.push('');
      out.push(itemBlock(it, ++n));
    });
  }

  if (priced.length) {
    out.push('', RULE, '💰 <b>ПО ПРАЙСУ</b> · ' + priced.length + ' поз.', '');
    priced.forEach(function (it, i) {
      if (i) out.push('');
      out.push(itemBlock(it, ++n));
    });
  }

  if (hidden) {
    out.push('', '<i>…и ещё ' + hidden + ' поз. — не поместились в сообщение.</i>');
  }

  if (sum) {
    out.push('', RULE, '🧾 Итого по прайсу: <b>' + money(sum) + '</b> без НДС');
  }
  return out.join('\n');
}

/**
 * data: { name, phone, email, comment, cart, sum, dateStr }
 * cart: [{ name, cat, size, qty, unit, price, ask, lineSum }]
 */
function buildOrderTelegramMessage(data) {
  var cart = Array.isArray(data.cart) ? data.cart : [];
  var sum = Number(data.sum) || 0;

  var head = [];
  head.push('📦 <b>Новая заявка с сайта</b>');
  head.push('<i>' + esc(data.dateStr) + '</i>');
  head.push('');
  head.push('👤 <b>' + esc(data.name) + '</b>');
  head.push('📞 <code>' + esc(data.phone) + '</code>');
  if (data.email) head.push('✉️ ' + esc(data.email));
  if (data.comment) {
    head.push('');
    head.push('💬 <b>Комментарий</b>');
    head.push(esc(data.comment));
  }

  var asks = cart.filter(function (i) { return i.ask; });
  var priced = cart.filter(function (i) { return !i.ask; });

  // Не влезает в лимит Telegram — убираем позиции с конца: сначала
  // из прайсовых (их сумма всё равно есть в итоге), потом из «по запросу».
  var hidden = 0;
  var text = compose(head, asks, priced, sum, hidden);
  while (text.length > TG_TEXT_LIMIT && (asks.length || priced.length)) {
    if (priced.length) priced = priced.slice(0, -1);
    else asks = asks.slice(0, -1);
    hidden++;
    text = compose(head, asks, priced, sum, hidden);
  }
  return text.slice(0, TG_TEXT_LIMIT);
}

module.exports = { buildOrderTelegramMessage: buildOrderTelegramMessage, esc: esc, money: money };
