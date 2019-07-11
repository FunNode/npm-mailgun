/* eslint-disable brace-style, camelcase, semi */
/* eslint-env mocha */

var chai = require('chai');
var assert = chai.assert;

const config = {
  domain: 'funnode.com',
  key: '131133',
  live: false
};

describe('Mailer', () => {
  let mailer = new (require('./index.js'))(config.domain, config.key, config.live);
  let msg = { text: `test message` };
  let returned_message = mailer.queue(msg);
  mailer.time_interval = 1000;

  describe('Queue Messages', () => {
    it('should return the same referenced object', (done) => {
      assert.equal(returned_message, msg);
      done();
    });

    it('should queue in the array', (done) => {
      assert.equal(mailer.queued.length, 1)
      done();
    });

    it('should be present in the queue', (done) => {
      assert.equal(mailer.queued[0], msg);
      done();
    });

    it('should have a timer to send messages', (done) => {
      assert.notEqual(mailer.timeout, false);
      done();
    });

    it('should return false for empty message', (done) => {
      assert.equal(mailer.queue({ text: `` }), false);
      done();
    });
  });

  describe('Prepare Messages', () => {
    it('should set subject and date', (done) => {
      let today = new Date();
      today = `${today.getMonth() + 1}-${today.getDate()}`;
      assert.notEqual(returned_message.subject.indexOf(today), -1);
      done();
    });

    it('should set sender to no-reply@funnode.com', (done) => {
      assert.equal(returned_message.from, 'no-reply@funnode.com');
      done();
    });

    it('should set prepared flag', (done) => {
      assert.equal(returned_message.prepared, true);
      done();
    });
  });

  describe('Send Queued Messages', () => {
    it('should accept two messages', (done) => {
      let msg2 = { 'text': 'test message 2' };
      mailer.queue(msg2);
      assert.equal(mailer.queued.length, 2);
      done();
    });

    it('should send two messages', (done) => {
      this.timeout(mailer.time_interval + 500);
      console.log('This next test may take ' + (mailer.time_interval + 100) / 1000 + 'seconds');

      setTimeout(() => {
        assert.equal(mailer.queued.length, 0);
        done();
      }, mailer.time_interval + 50);
    });
  });
});
