/* eslint-disable brace-style, camelcase, semi */
/* global R5 */

module.exports = Mailer;

if (!global.R5) {
  global.R5 = {
    out: console
  }
}

let mailer = require('mailgun-js');

// Constructors

function Mailer (domain, key, live = false) {
  this.live = live;
  this.client = mailer({
    domain: domain,
    apiKey: key
  });

  this.queued = [];
  this.timeout = false;

  this.time_interval = 15000;
}

// Public Methods

Mailer.prototype = {
  queue: function (message) {
    if (!message.prepared) { message = prepared_message(message); }
    if (!message) { return false; }

    clearTimeout(this.timeout);
    this.queued.push(message);
    this.timeout = setTimeout(send_queued, this.time_interval, this);

    return message;
  },

  send: function (message) {
    if (!message.prepared) { message = prepared_message(message); }
    if (!message) { return false; }

    message.html = message_html(message.text);

    if (this.live) {
      this.client.messages().send(message, function (error, body) {
        if (error) { R5.out.error(error); }
        else { R5.out.log(body); }
      });
    }
    else {
      R5.out.log('Email not sent (on DEV)');
    }

    return message;
  }
};

// Private Methods

function send_queued (mailer) {
  let last_message = {};

  while (mailer.queued.length > 0) {
    let message = mailer.queued.splice(0, 1)[0];
    last_message = send_queued_message(mailer, last_message, message);
  }

  if (last_message) { mailer.send(last_message); }
}

function send_queued_message(mailer, last_message, message) {
  let same_owner = (message.subject === last_message.subject && message.from === last_message.from && message.to === last_message.to);
  if (same_owner) {
    last_message.text += `<li>${message.text}</li>`;
  } else {
    if (last_message) { mailer.send(last_message); }
    last_message = message;
  }
  return last_message;
}

function prepared_message (message) {
  if (!message.text) { return false; }

  let today = new Date();
  today = `${today.getMonth() + 1}-${today.getDate()}`;

  message.subject = `(${today}) ${(message.subject || 'System message')}`;
  message.subject += ` - FunNode Mailer (${require('os').hostname()})`;

  message.from = message.from || 'no-reply@funnode.com';
  message.to = message.to || 'admin@funnode.com';

  message.prepared = true;
  return message;
}

function message_html (text) {
  return `
    <!DOCTYPE HTML>
    <html lang="en-US">
      <head><title>FunNode</title></head>
      <body style="background-color:#F5F5F5;font:1.1em Century Gothic,sans-serif;height:100%;line-height:1.4em;padding:14px;min-width:500px;">
        <div style="background-color:#FFF;border:1px solid #DDD;border-radius:9px;margin:14px auto;padding:14px;">
          <a href="https://www.funnode.com/" target="_blank" title="FunNode Homepage" style="color: #B73737;"><img src="https://www.funnode.com/assets/imgs/logo.jpg" alt="funnode logo" style="margin-bottom:9px;" /></a>
          <ul>
            <li>${text}</li>
          </ul>
          <hr />
          <p><a href="https://www.funnode.com/" target="_blank" title="FunNode Homepage" style="color: #B73737;">FunNode.com</a> is a <strong itemprop="applicationCategory">modern gaming website</strong> that hosts some of the most popular board games and card games in the world. The visually-appealing and browser-friendly interface (<strong>no flash</strong> and <strong>no java</strong>) gives players the freedom to play on various devices, including smartphones and tablets. Moreover, FunNode does not require you to register, and is completely <strong>Free-to-Play</strong>!</p>
          <p>For a complete list of recent changes on FunNode, check out the <a href="https://www.funnode.com/news#changelog" title="Check out the changes at FunNode" style="color: #B73737;">Changelog</a>. We are also welcoming feedback for improvements and requests for new features and/or games to add to FunNode. Please feel free to submit them in our <a href="https://www.funnode.com/forums" title="FunNode Forums" style="color: #B73737;">Forums</a> or <a href="https://www.funnode.com/requests" title="FunNode Requests" style="color: #B73737;">Requests page</a>.</p>
        </div>
      </body>
    </html>
  `;
}
