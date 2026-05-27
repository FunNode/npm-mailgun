/* global R5 */

module.exports = Mailer;

if (!global.R5) {
  global.R5 = {
    out: console
  };
}

let mailgun = require('mailgun-js');

// Constructors

function Mailer (domain, key, live = false) {
  this.live = live;
  if (live) {
    this.client = mailgun({ domain: domain, apiKey: key });
  }
  this.queued = [];
  this.timeout = false;
  this.time_interval = 15000;
}

// Public Methods

Mailer.prototype = {
  queue: function (message) {
    if (!message) {
      return false;
    }
    if (!message.prepared) {
      message = prepare_message(message);
    }
    this.queued.unshift(message);

    clearTimeout(this.timeout);
    this.timeout = setTimeout(send_queued, this.time_interval, this);

    return message;
  },

  send: async function (message) {
    if (!message) {
      return false;
    }
    if (!message.prepared) {
      message = prepare_message(message);
    }

    const is_admin = !!message.to.is_admin;
    message.html = message_html(message.title, message.subtitle, message.text, message.to);
    message.to = message.to.email;

    if (this.live || is_admin) {
      try {
        const body = await this.client.messages().send(message);
        R5.out.log(body);
      }
      catch (err) {
        R5.out.error(err);
      }
    }
    else {
      R5.out.log(`"${message.title}" email to "${message.to}" not sent (on DEV)`);
    }

    return message;
  }
};

// Private Methods

async function send_queued (mailer) {
  let last_message;

  while (mailer.queued.length > 0) {
    let message = mailer.queued.pop();

    if (same_header(message, last_message)) {
      last_message.text += `<li>${message.text}</li>`;
    }
    else {
      if (last_message) {
        await mailer.send(last_message);
      }
      last_message = message;
    }
  }

  await mailer.send(last_message);
}

function prepare_message (message) {
  let today = new Date();
  today = `${today.getMonth() + 1}-${today.getDate()}`;

  message.title = message.subject || 'System message';
  message.subject = `(${today}) ${message.title} - FunNode Mailer`;

  message.from = message.from || 'no-reply@funnode.com';
  if (!message.to) {
    message.to = {
      email: 'admin@funnode.com',
      user: 'Admin'
    };
  }

  message.prepared = true;
  return message;
}

function same_header (message_one, message_two = {}) {
  if (
    message_one.subject === message_two.subject &&
    message_one.from === message_two.from &&
    message_one.to.email === message_two.to.email
  ) {
    return true;
  }
  return false;
}

function message_html (title, subtitle, text, to) {
  const profile_url = `https://www.funnode.com/players/${encodeURIComponent(to.user)}`;
  const unsub_url   = `${profile_url}?unsubscribe=${encodeURIComponent(to.unsubscribe)}`;

  const chip = (label) =>
    `<span style='display:inline-block;font-size:11px;font-weight:700;padding:4px 10px 3px;border-radius:999px;background:#FFFFFF;border:1px solid #E8E0D2;color:#5A534A;margin:2px 3px 2px 0;'>${label}</span>`;

  const soc = (href, label, ml = '') =>
    `<a href='${href}' rel='noopener' target='_blank' style='display:inline-block;width:30px;height:30px;border-radius:50%;background:#FBF8F2;border:1px solid #E8E0D2;text-align:center;line-height:30px;font-size:12px;font-weight:800;color:#5A534A;text-decoration:none;${ml}'>${label}</a>`;

  const unsub_line = to.unsubscribe
    ? `<br>Manage preferences on your <a href='${profile_url}' rel='noopener' target='_blank' style='color:#5A534A;text-decoration:underline;'>Profile</a> or <a href='${unsub_url}' rel='noopener' target='_blank' style='color:#5A534A;text-decoration:underline;'>Unsubscribe</a>.`
    : '';

  return `
    <!DOCTYPE HTML><html lang='en-US'>
    <head>
      <meta charset='utf-8'>
      <meta name='viewport' content='width=device-width, initial-scale=1.0'>
      <title>FunNode</title>
      <link rel='preconnect' href='https://fonts.googleapis.com'>
      <link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
      <link href='https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap' rel='stylesheet'>
    </head>
    <body style='background:#EFE9DC;font-family:Nunito,"Century Gothic",Arial,sans-serif;margin:0;padding:0;'>
      <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#EFE9DC;padding:28px 0 48px;'>
        <tr><td align='center'>
          <table width='640' cellpadding='0' cellspacing='0' border='0' style='background:#FFFFFF;border-radius:18px;border:1px solid #E8E0D2;box-shadow:0 14px 40px rgba(42,38,34,0.10);max-width:640px;margin:0 auto;'>

            <!-- Hero -->
            <tr><td style='padding:0;'>
              <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:linear-gradient(135deg,rgba(240,179,94,0.25) 0%,rgba(143,205,200,0.20) 50%,rgba(234,166,168,0.15) 100%),#FBF8F2;border-bottom:1px solid #E8E0D2;border-radius:18px 18px 0 0;overflow:hidden;'>
                <tr>
                  <td style='padding:22px 28px 24px;vertical-align:top;'>
                    <p style='font-size:18px;line-height:1.45;color:#2A2622;margin:6px 0 0;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>Hi <span style='background:linear-gradient(180deg,transparent 62%,rgba(240,179,94,0.55) 62%);padding:0 2px;font-weight:800;'>${to.user}</span>!</p>
                    <p style='font-size:14px;color:#5A534A;margin:8px 0 0;line-height:1.5;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>${subtitle}</p>
                  </td>
                  <td width='94' style='padding:22px 22px 24px 0;vertical-align:top;'>
                    <table cellpadding='0' cellspacing='0' border='0' style='border-radius:16px;background:#FFFFFF;border:1px solid #E8E0D2;box-shadow:0 2px 0 rgba(42,38,34,0.04);'>
                      <tr><td style='padding:6px;line-height:0;font-size:0;'>
                        <img src='https://assets.funnode.com/imgs/logo.jpg' alt='FunNode' width='60' height='60' style='display:block;border-radius:10px;'>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>

            <!-- Content -->
            <tr><td style='padding:20px 28px 16px;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>
              ${text}
            </td></tr>

            <!-- About -->
            <tr><td style='background:#FBF8F2;padding:22px 28px;border-top:1px solid #E8E0D2;'>
              <p style='font-size:14px;font-weight:800;color:#2A2622;margin:0 0 10px;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>
                <span style='display:inline-block;width:28px;height:3px;background:#F0B35E;border-radius:2px;vertical-align:middle;margin-right:10px;'></span>
                Play Games for Free!
              </p>
              <p style='font-size:13.5px;line-height:1.6;color:#5A534A;margin:0 0 12px;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>
                <strong>FunNode</strong> is a modern gaming website that hosts some of the most popular board games, card games, and dice games in the world. The lightweight, browser&#8209;based interface works seamlessly across devices, including smartphones and tablets. No downloads or plugins required. Moreover, FunNode does not require you to register.
              </p>
              ${chip('Browser&#8209;based')}
              ${chip('No downloads')}
              ${chip('No sign&#8209;up')}
              <span style='display:inline-block;font-size:11px;font-weight:700;padding:4px 10px 3px;border-radius:999px;background:#E5F1FC;border:1px solid #B3D4F8;color:#0074D9;margin:2px 3px 2px 0;'>Free&#8209;to&#8209;Play</span>
            </td></tr>

            <!-- Footer -->
            <tr><td style='padding:18px 28px 24px;background:#FFFFFF;border-top:1px solid #E8E0D2;'>
              <table width='100%' cellpadding='0' cellspacing='0' border='0'><tr>
                <td style='font-size:12px;color:#928A7F;line-height:1.55;vertical-align:middle;font-family:Nunito,"Century Gothic",Arial,sans-serif;'>
                  For the full list of changes, visit the <a href='https://www.funnode.com/news#changelog' rel='noopener' target='_blank' style='color:#5A534A;text-decoration:underline;'>Changelog</a>.<br>
                  Got an idea? Drop it on the <a href='https://www.funnode.com/forums' rel='noopener' target='_blank' style='color:#5A534A;text-decoration:underline;'>Forums</a> or <a href='https://www.funnode.com/requests' rel='noopener' target='_blank' style='color:#5A534A;text-decoration:underline;'>Requests</a> page.${unsub_line}
                </td>
                <td style='text-align:right;vertical-align:middle;padding-left:12px;'>
                  <table cellpadding='0' cellspacing='0' border='0' align='right'><tr>
                    <td>${soc('https://x.com/FunNode', '&#120143;')}</td>
                    <td style='padding-left:6px;'>${soc('https://www.facebook.com/pages/FunNode/502346023112099', 'f')}</td>
                  </tr></table>
                </td>
              </tr></table>
            </td></tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}
