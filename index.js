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
    this.client = mailgun({
      domain: domain,
      apiKey: key
    });
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

    message.html = message_html(message.title, message.text, message.to);
    message.to = message.to.email;

    if (this.live) {
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

function message_html (title, text, to) {
  return `
    <!DOCTYPE HTML><html lang='en-US'>\r\n
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>FunNode</title>
      </head>
      <body style='background-color:#F5F5F5;font-family:Century Gothic,"Mali","Atma","Patrick Hand","Ubuntu",Arial,sans-serif;height:100%;line-height:1.4em;padding:0;margin:0;min-width:500px;'>
        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='background-color:#F5F5F5;padding:14px 0;'>
          <tr>
            <td align='center' style='padding:14px 0;'>
              <table width='600' cellpadding='0' cellspacing='0' border='0' style='background-color:#FFF;border-radius:9px;border:1px solid #DDD;box-shadow:0 0 4px #CCC;max-width:600px;margin:0 auto;'>
                <tr>
                  <td style='padding:14px 14px 14px 14px;'>
                    <a href='https://www.funnode.com/' rel='noopener' target='_blank' title='FunNode Homepage' style='color: #0074D9; text-decoration:none;float:right;margin:0 0 9px 14px;'>
                      <img src='https://assets.funnode.com/imgs/logo.jpg' alt='funnode logo' style='border-radius:9px;border:1px solid #CCC;max-height:50px;max-width:50px;display:block;' />
                    </a>
                    ${text}
                  </td>
                </tr>
                <tr>
                  <td style='padding:14px;border-top:1px solid #DDD;background-color:#F5F5F5;'>
                    <hr style='margin-top: 18px; margin-bottom: 9px; border: none; border-top: 1px solid #DDD;' />
                    <p style='font-size: 72%; color:#555; margin:0 0 9px 0; line-height:1.4;'><a href='https://www.funnode.com/' rel='noopener' target='_blank' title='FunNode Homepage' style='color: #0074D9;text-decoration:none;'>FunNode.com</a> is a <strong>modern gaming website</strong> that hosts some of the most popular board games and card games in the world. The visually-appealing and browser-friendly interface (<strong>no flash</strong> and <strong>no java</strong>) gives players the freedom to play on various devices, including smartphones and tablets. Moreover, FunNode does not require you to register, and is completely <strong>Free-to-Play</strong>!</p>
                    <p style='font-size: 72%; color:#555; margin:0; line-height:1.4;'>For a complete list of recent changes on FunNode, check out the <a href='https://www.funnode.com/news#changelog' rel='noopener' target='_blank' title='Check out the changes at FunNode' style='color: #0074D9;text-decoration:none;'>Changelog</a>. We are also welcoming feedback for improvements and requests for new features and/or games to add to FunNode. Please feel free to submit them in our <a href='https://www.funnode.com/forums' rel='noopener' target='_blank' title='FunNode Forums' style='color: #0074D9;text-decoration:none;'>Forums</a> or <a href='https://www.funnode.com/requests' rel='noopener' target='_blank' title='FunNode Requests' style='color: #0074D9;text-decoration:none;'>Requests page</a>.</p>
                  </td>
                </tr>
                ${(to.unsubscribe) ?
                  `<tr>
                    <td style='padding:9px 14px;background-color:#F5F5F5;border-top:1px solid #DDD;'>
                      <p style='font-size: 81%; color:#555; margin:0; text-align:center;'>This email was sent to you as determined by your preferences. You may change your preferences on your <a href='https://www.funnode.com/players/${to.user}' rel='noopener' target='_blank' title='View Profile Page' style='color: #0074D9;text-decoration:none;'>profile page</a>. You may also <a href='https://www.funnode.com/players/${to.user}?unsubscribe=${to.unsubscribe}' rel='noopener' target='_blank' title='Unsubscribe' style='color: #0074D9;text-decoration:none;'>unsubscribe</a> from all emails.</p>
                    </td>
                  </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
