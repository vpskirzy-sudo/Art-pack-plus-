/**
 * Письмо с заявкой на расчёт — строится из данных формы и корзины.
 * Живёт вне tools/ и api/, потому что Vercel превращает каждый файл
 * непосредственно в /api в отдельную функцию: сюда он не заглядывает,
 * а require('../lib/...') из api/send-order.js работает как обычно.
 *
 * Числа (цены, суммы) сюда приходят уже посчитанными на клиенте —
 * фронтенд и так их считает для отображения корзины, а письмо это
 * не финансовый документ: реальную стоимость с доставкой и печатью
 * в любом случае подтверждает менеджер, так что дублировать разбор
 * цен второй раз на сервере смысла нет. Экранирование HTML — здесь,
 * на сервере, потому что доверять чужому вводу нельзя.
 */
'use strict';

var ACCENT = '#E07B26';
var INK = '#0B1118';
var TEXT_SOFT = '#5B6672';
var BORDER = '#E7E1D6';
var PAPER = '#F7F3ED';

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  n = Number(n) || 0;
  return n.toFixed(2).replace('.', ',') + ' руб.';
}

function nl2br(s) {
  return esc(s).replace(/\r\n|\r|\n/g, '<br>');
}

/** Строки таблицы корзины. Пустая корзина — не ошибка: заявка может быть
 *  просто вопросом или заказом «по запросу» без единой готовой позиции. */
function cartRowsHtml(cart) {
  if (!cart.length) {
    return '<tr><td style="padding:14px 16px;color:' + TEXT_SOFT + ';font-size:14px" colspan="4">' +
      'Без позиций из корзины — клиент оставил только контакты и комментарий.</td></tr>';
  }
  return cart.map(function (item, i) {
    var name = esc(item.name || '—');
    var cat = item.cat ? '<div style="font-size:12px;color:' + TEXT_SOFT + ';margin-top:2px">' + esc(item.cat) + '</div>' : '';
    var size = esc(item.size || '—');
    var qty = Number(item.qty) || 0;
    var priceCell = item.ask
      ? '<span style="color:' + TEXT_SOFT + ';font-style:italic">по запросу</span>'
      : esc(item.price != null ? String(item.price) : '—');
    var sumCell = item.ask
      ? '<span style="color:' + TEXT_SOFT + ';font-style:italic">по запросу</span>'
      : '<b>' + money(item.lineSum) + '</b>';
    var rowBg = i % 2 ? PAPER : '#FFFFFF';
    return (
      '<tr style="background:' + rowBg + '">' +
        '<td style="padding:12px 16px;border-bottom:1px solid ' + BORDER + ';font-size:14px;color:' + INK + '">' +
          (i + 1) + '. ' + name + cat +
        '</td>' +
        '<td style="padding:12px 16px;border-bottom:1px solid ' + BORDER + ';font-size:14px;color:' + INK + '">' + size + '</td>' +
        '<td style="padding:12px 16px;border-bottom:1px solid ' + BORDER + ';font-size:14px;color:' + INK + ';text-align:right">' + qty + ' шт.</td>' +
        '<td style="padding:12px 16px;border-bottom:1px solid ' + BORDER + ';font-size:14px;text-align:right;white-space:nowrap">' + priceCell + '</td>' +
        '<td style="padding:12px 16px;border-bottom:1px solid ' + BORDER + ';font-size:14px;text-align:right;white-space:nowrap">' + sumCell + '</td>' +
      '</tr>'
    );
  }).join('');
}

function contactRow(icon, label, valueHtml) {
  return (
    '<tr>' +
      '<td style="padding:6px 0;vertical-align:top;width:110px;font-size:13px;color:' + TEXT_SOFT + '">' + esc(label) + '</td>' +
      '<td style="padding:6px 0;font-size:15px;color:' + INK + ';font-weight:600">' + valueHtml + '</td>' +
    '</tr>'
  );
}

/**
 * data: { name, phone, email, comment, cart, sum, asksCount, dateStr }
 * cart: [{ name, cat, size, qty, price, ask, url, lineSum }]
 */
function buildOrderEmailHtml(data) {
  var name = esc(data.name);
  var phone = esc(data.phone);
  var email = data.email ? esc(data.email) : '';
  var comment = data.comment ? nl2br(data.comment) : '';
  var cart = Array.isArray(data.cart) ? data.cart : [];
  var sum = Number(data.sum) || 0;
  var asksCount = Number(data.asksCount) || 0;

  var totalLine = '';
  if (cart.length) {
    if (sum) {
      totalLine = 'Итого без НДС: <b style="color:' + INK + '">' + money(sum) + '</b>' +
        (asksCount ? ' &nbsp;·&nbsp; ещё ' + asksCount + ' поз. по запросу' : '');
    } else if (asksCount) {
      totalLine = 'Все позиции — по запросу, цену сообщит менеджер.';
    }
  }

  return (
'<!doctype html>' +
'<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>Новая заявка на расчёт</title></head>' +
'<body style="margin:0;padding:0;background:' + PAPER + ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + PAPER + ';padding:28px 12px">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid ' + BORDER + '">' +

        // Шапка
        '<tr><td style="background:' + INK + ';padding:26px 32px;">' +
          '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:20px;color:#FFFFFF;letter-spacing:-.01em">' +
            'АРТ-ПАК <span style="color:' + ACCENT + '">ПЛЮС</span>' +
          '</div>' +
          '<div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,.62)">Новая заявка на расчёт · ' + esc(data.dateStr) + '</div>' +
        '</td></tr>' +

        // Приветствие менеджеру
        '<tr><td style="padding:22px 32px 4px">' +
          '<div style="font-size:15px;line-height:1.5;color:' + INK + '">Владимир, с сайта пришла новая заявка — состав ниже, контакты клиента для связи прикреплены.</div>' +
        '</td></tr>' +

        // Клиент
        '<tr><td style="padding:18px 32px 6px">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
            contactRow(null, 'Имя', name) +
            contactRow(null, 'Телефон', '<a href="tel:' + phone.replace(/[^\d+]/g, '') + '" style="color:' + ACCENT + ';text-decoration:none">' + phone + '</a>') +
            (email ? contactRow(null, 'E-mail', '<a href="mailto:' + email + '" style="color:' + ACCENT + ';text-decoration:none">' + email + '</a>') : '') +
          '</table>' +
        '</td></tr>' +

        (comment ? (
        '<tr><td style="padding:6px 32px 6px">' +
          '<div style="font-size:13px;color:' + TEXT_SOFT + ';margin-bottom:4px">Комментарий клиента</div>' +
          '<div style="font-size:14.5px;line-height:1.55;color:' + INK + ';background:' + PAPER + ';border-radius:10px;padding:14px 16px">' + comment + '</div>' +
        '</td></tr>') : '') +

        // Состав заказа
        '<tr><td style="padding:22px 32px 0">' +
          '<div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' + TEXT_SOFT + ';border-top:1px solid ' + BORDER + ';padding-top:18px">Состав заказа</div>' +
        '</td></tr>' +
        '<tr><td style="padding:12px 24px 8px">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
            '<thead><tr>' +
              '<th align="left" style="padding:0 16px 8px;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + TEXT_SOFT + '">Позиция</th>' +
              '<th align="left" style="padding:0 16px 8px;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + TEXT_SOFT + '">Размер</th>' +
              '<th align="right" style="padding:0 16px 8px;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + TEXT_SOFT + '">Тираж</th>' +
              '<th align="right" style="padding:0 16px 8px;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + TEXT_SOFT + '">Цена</th>' +
              '<th align="right" style="padding:0 16px 8px;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:' + TEXT_SOFT + '">Сумма</th>' +
            '</tr></thead>' +
            '<tbody>' + cartRowsHtml(cart) + '</tbody>' +
          '</table>' +
        '</td></tr>' +

        (totalLine ? (
        '<tr><td style="padding:8px 32px 4px;text-align:right;font-size:14.5px;color:' + INK + '">' + totalLine + '</td></tr>'
        ) : '') +

        '<tr><td style="padding:26px 32px 28px">' +
          (email
            ? '<a href="mailto:' + email + '?subject=' + encodeURIComponent('Re: заявка на расчёт') + '" ' +
                'style="display:inline-block;background:' + ACCENT + ';color:#fff;text-decoration:none;font-weight:700;font-size:14.5px;padding:13px 26px;border-radius:100px">' +
                'Ответить на почту' +
              '</a>'
            : '<a href="tel:' + phone.replace(/[^\d+]/g, '') + '" ' +
                'style="display:inline-block;background:' + ACCENT + ';color:#fff;text-decoration:none;font-weight:700;font-size:14.5px;padding:13px 26px;border-radius:100px">' +
                'Позвонить клиенту' +
              '</a>') +
        '</td></tr>' +

        '<tr><td style="padding:16px 32px;background:' + PAPER + ';border-top:1px solid ' + BORDER + '">' +
          '<div style="font-size:12px;color:' + TEXT_SOFT + '">Письмо сформировано автоматически формой заявки на gofrocarton.by.</div>' +
        '</td></tr>' +

      '</table>' +
    '</td></tr>' +
  '</table>' +
'</body></html>'
  );
}

/** Текстовая копия — на случай почтового клиента без HTML. */
function buildOrderEmailText(data) {
  var lines = [
    'Новая заявка на расчёт — ' + data.dateStr,
    '',
    'Имя: ' + data.name,
    'Телефон: ' + data.phone
  ];
  if (data.email) lines.push('E-mail: ' + data.email);
  if (data.comment) lines.push('', 'Комментарий: ' + data.comment);

  var cart = Array.isArray(data.cart) ? data.cart : [];
  if (cart.length) {
    lines.push('', 'Состав заказа:');
    cart.forEach(function (item, i) {
      var priceTxt = item.ask ? 'цена по запросу' : (item.price + ' за шт., сумма ' + money(item.lineSum));
      lines.push((i + 1) + '. ' + (item.cat ? item.cat + ' — ' : '') + item.name +
        ' · размер ' + (item.size || '—') + ' · тираж ' + item.qty + ' шт. · ' + priceTxt);
    });
    if (data.sum) lines.push('Итого без НДС: ' + money(data.sum));
    if (data.asksCount) lines.push('Позиций «по запросу»: ' + data.asksCount);
  } else {
    lines.push('', 'Без позиций из корзины.');
  }
  return lines.join('\n');
}

module.exports = { buildOrderEmailHtml: buildOrderEmailHtml, buildOrderEmailText: buildOrderEmailText, esc: esc, money: money };
