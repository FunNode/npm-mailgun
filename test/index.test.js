/* eslint-env mocha */
const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

describe('Mailer', () => {
  const domain = 'domain';
  const key = 'key';
  const live = true;
  const time_interval = 0;
  let sandbox;
  let message;
  let send;
  let mailgunLib;
  let Mailer;
  let mailer;
  
  function delay (ms) {
    return new Promise((res) => setTimeout(res, ms));
  }
  
  function inject () {
    mailgunLib = sandbox.stub().returns({
      messages: () => ({ send }),
    });
    Mailer = proxyquire('../index', {
      'mailgun-js': mailgunLib,
    });
    mailer = new Mailer(domain, key, live);
    mailer.time_interval = time_interval;
  }

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    message = { text: 'test message' };
    send = sandbox.stub().resolves();
    inject();
  });
  
  afterEach(function () {
    sandbox.restore();
  });

  it('constructs', function () {
    Object.entries({
      live,
      queued: [],
      timeout: false,
      time_interval,
    }).forEach(([k, v]) => expect(mailer[k]).to.eql(v));
    expect(mailer.client.messages()).to.eql({ send });
    expect(mailgunLib).to.have.been.calledWith({
      domain,
      apiKey: key,
    });
  });

  it('constructs for dev by default', function () {
    mailer = new Mailer();
    expect(mailer.live).to.be.false;
    expect(mailgunLib).to.have.been.calledOnce; // not twice
  });
  
  it('queues', function () {
    mailer.queue(message);
    const message2 = { text: 'test message 2' };
    mailer.queue(message2);
    expect(mailer.queued.length).to.eql(2);
    expect(mailer.queued[0]).to.contain(message2);
    expect(mailer.queued[1]).to.contain(message);
  });

  it('prepares message before queuing', function () {
    mailer.queue(message);
    expect(mailer.queued[0]).to.have.keys([
      'title', 'subject', 'from', 'to', 'text', 'prepared',
    ]);
  });

  it('skips preparing message if already prepared before queuing', function () {
    const title = 'i am prepared';
    message = {
      title,
      subject: 'subject',
      from: 'from',
      to: 'to',
      text: 'text',
      prepared: true,
    };
    mailer.queue(message);
    expect(mailer.queued[0].title).to.eql(title);
  });

  it('skips queuing empty message', function () {
    mailer.queue();
    expect(mailer.queued.length).to.eql(0);
  });

  it('queues and starts timer', async function () {
    await mailer.queue(message);
    expect(this.timeout).to.not.be.false;
  });

  it('sends', async function () {
    await mailer.send(message);
    expect(send).to.have.been.calledWith(message);
  });

  it('prepares message before sending', async function () {
    await mailer.send(message);
    expect(send.args[0][0]).to.have.keys([
      'title', 'subject', 'from', 'to', 'text', 'prepared', 'html',
    ]);
  });

  it('skips preparing message if already prepared before sending', async function () {
    const title = 'i am prepared';
    message = {
      title,
      subject: 'subject',
      from: 'from',
      to: 'to',
      text: 'text',
      prepared: true,
    };
    await mailer.send(message);
    expect(send.args[0][0].title).to.eql(title);
  });

  it('skips sending empty message', async function () {
    await mailer.send();
    expect(send).to.not.have.been.called;
  });

  it('skips sending in dev', async function () {
    mailer = new Mailer(domain, key, false);
    await mailer.send(message);
    expect(send).to.not.have.been.called;
  });

  it('fails to send and continues running', async function () {
    send = sandbox.stub().rejects({ error: 'error' });
    inject();
    await mailer.send(message);
    expect(send).to.have.been.calledWith(message);
  });

  it('consumes queue', async function () {
    await mailer.queue(message);
    await mailer.queue(message);
    expect(mailer.queued.length).to.eql(2);
    await delay(1);
    expect(mailer.queued.length).to.eql(0);
  });
  
  it('consumes queue with same header', async function () {
    mailer.send = sandbox.stub().resolves();
    await mailer.queue(message);
    const message2 = { text: 'test message 2' };
    await mailer.queue(message2);
    await delay(1);
    expect(mailer.send).to.have.been.calledOnce;
    expect(mailer.send.args[0][0]).to.eql(message);
    expect(mailer.send.args[0][0].text).to.eql('test message<li>test message 2</li>');
  });
  
  it('consumes queue with different headers', async function () {
    mailer.send = sandbox.stub().resolves();
    await mailer.queue(message);
    const message2 = { text: 'test message 2', subject: 'subject' };
    await mailer.queue(message2);
    await delay(1);
    expect(mailer.send).to.have.been.calledTwice;
    expect(mailer.send.args[0][0].text).to.eql('test message');
    expect(mailer.send.args[1][0].text).to.eql('test message 2');
  });

  it('consumes queue with mixed headers', async function () {
    mailer.send = sandbox.stub().resolves();
    await mailer.queue(message);
    await mailer.queue(message);
    const message2 = { text: 'test message 2', subject: 'subject' };
    await mailer.queue(message2);
    await delay(1);
    expect(mailer.send).to.have.been.calledTwice;
    expect(mailer.send.args[0][0].text).to.eql('test message<li>test message</li>');
    expect(mailer.send.args[1][0].text).to.eql('test message 2');
  });

  it('consumes queue with mixed headers in inverse order', async function () {
    mailer.send = sandbox.stub().resolves();
    const message2 = { text: 'test message 2', subject: 'subject' };
    await mailer.queue(message2);
    await mailer.queue(message);
    await mailer.queue(message);
    await delay(1);
    expect(mailer.send).to.have.been.calledTwice;
    expect(mailer.send.args[1][0].text).to.eql('test message<li>test message</li>');
    expect(mailer.send.args[0][0].text).to.eql('test message 2');
  });
});
