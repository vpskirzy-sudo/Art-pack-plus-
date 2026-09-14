/**
 * Сообщение с заявкой на расчёт для Telegram-бота отдела продаж.
 * Тот же принцип, что и в lib/email-template.js: числа приходят уже
 * посчитанными с клиента, здесь только форматирование и экранирование
 * пользовательского ввода — сообщение уходит в Telegram с parse_mode
 * "HTML", поэтому чужой текст (имя, комментарий) экранируется так же,
 * как в письме.
 *
 * Telegram обрезает сообщение длиннее 4096 символов на своей стороне
 * без предупреждения — если состав заказа большой, sendMessage.js режет
 * список позиций сам и дописывает, сколько ещё осталось, чтобы менеджер
 * не терял хвост заявки молча.
 */
'use strict';

var TG_TEXT_LIMIT = 4096;

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(n) {
  n = Number(n) || 0;
  return n.toFixed(2).replace('.', ',') + ' руб.';
}

/** Одна строка состава заказа. */
function cartLine(item, i) {
  var head = '<b>' + (i + 1) + '. ' + esc(item.name || '—') + '</b>' +
    (item.cat ? ' <i>(' + esc(item.cat) + ')</i>' : '');
  var priceTxt = item.ask
    ? 'цена по запросу'
    : (item.price != null ? esc(String(item.price)) + '/шт · сумма ' + money(item.lineSum) : '—');
  var sizeTxt = item.size ? 'размер ' + esc(item.size) + ' · ' : '';
  return head + '\n' + '   ' + sizeTxt + 'тираж ' + (Number(item.qty) || 0) + ' шт. · ' + priceTxt;
}

/**
 * data: { name, phone, email, comment, cart, sum, asksCount, dateStr }
 * cart: [{ name, cat, size, qty, price, ask, lineSum }]
 */
function buildOrderTelegramMessage(data) {
  var name = esc(data.name);
  var phone = esc(data.phone);
  var email = data.email ? esc(data.email) : '';
  var comment = data.comment ? esc(data.comment) : '';
  var cart = Array.isArray(data.cart) ? data.cart : [];
  var sum = Number(data.sum) || 0;
  var asksCount = Number(data.asksCount) || 0;

  var lines = [];
  lines.push('📦 <b>Новая заявка с сайта — Арт-Пак Плюс</b>');
  lines.push('🕒 ' + esc(data.dateStr));
  lines.push('');
  lines.push('👤 <b>Клиент</b>');
  lines.push('Имя: ' + name);
  lines.push('Телефон: <code>' + phone + '</code>');
  if (email) lines.push('E-mail: ' + email);
  if (comment) lines.push('Комментарий клиента: ' + comment);

  lines.push('');
  lines.push('🛒 <b>Состав заказа</b>');
  if (!cart.length) {
    lines.push('Без позиций из корзины — клиент оставил только контакты и комментарий.');
  } else {
    cart.forEach(function (item, i) { lines.push(cartLine(item, i)); });
    if (sum) {
      lines.push('');
      lines.push('💰 Итого без НДС: <b>' + money(sum) + '</b>' +
        (asksCount ? ' (ещё ' + asksCount + ' поз. по запросу)' : ''));
    } else if (asksCount) {
      lines.push('');
      lines.push('💰 Все позиции — по запросу, цену сообщит менеджер.');
    }
  }

  lines.push('');
  lines.push('✅ <b>Что сделать менеджеру</b>');
  lines.push('1. Перезвонить клиенту в рабочее время по телефону выше.');
  lines.push('2. Для позиций «по запросу» — уточнить точные размеры, тираж и марку картона.');
  lines.push('3. Уточнить, нужна ли печать (логотип/маркировка, количество цветов).');
  lines.push('4. Уточнить способ получения: самовывоз из Заславля или доставка (адрес, район).');
  lines.push('5. Согласовать с клиентом итоговую стоимость с учётом тиража, печати и доставки, и срок изготовления.');

  lines.push('');
  lines.push('📌 <b>Уточнить/подтвердить у клиента</b>');
  lines.push('— точные размеры и тираж, если позиция «по запросу»;');
  lines.push('— нужна ли печать и какая (цвет, макет, тираж с печатью);');
  lines.push('— адрес и способ доставки или дату самовывоза;');
  lines.push('— удобное время для связи.');

  return trimToLimit(lines);
}

/** Режет по строкам состава заказа снизу, пока сообщение не влезет в лимит
 *  Telegram, — остальные блоки (клиент, чек-лист менеджеру) важнее и не трогаются. */
function trimToLimit(lines) {
  var text = lines.join('\n');
  if (text.length <= TG_TEXT_LIMIT) return text;

  var cartStart = lines.indexOf('🛒 <b>Состав заказа</b>') + 1;
  var cartEnd = cartStart;
  while (cartEnd < lines.length && lines[cartEnd].indexOf('💰') !== 0 && lines[cartEnd] !== '') cartEnd++;

  var head = lines.slice(0, cartStart);
  var cartLines = lines.slice(cartStart, cartEnd);
  var tail = lines.slice(cartEnd);

  var cutNote = '…список длиннее лимита Telegram, остальные позиции — в корзине на сайте клиента.';
  while (cartLines.length && (head.concat(cartLines, [cutNote], tail).join('\n')).length > TG_TEXT_LIMIT) {
    cartLines.pop();
    if (cartLines.length && cartLines[cartLines.length - 1].indexOf('   ') === 0) cartLines.pop();
  }
  return head.concat(cartLines, [cutNote], tail).join('\n').slice(0, TG_TEXT_LIMIT);
}

module.exports = { buildOrderTelegramMessage: buildOrderTelegramMessage, esc: esc, money: money };
