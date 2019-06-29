/* eslint-disable brace-style, camelcase, semi */
/* eslint-env mocha */

require('dotenv').config();

var chai = require('chai');
var assert = chai.assert;


describe('Mailer', function () {
  var mailer = new (require('./index.js'))(true);
  var msg = { text: `test message` };
  var returned_message = mailer.queue(msg);
  mailer.time_interval = 1000;

  describe('Queues Messages', function () {
    it('Should Return the Same Reference Object', function (done) {
      assert.equal(returned_message, msg, 'Message was not returned correctly');
      done();
    });
    it('Should Queue in the Array Correctly', function (done) {
      assert.equal(mailer.queued.length, 1, 'message.queued is not the correct length')
      done();
    });
    it('Should Be Present in the Queue', function (done) {
      assert.equal(mailer.queued[0], msg, 'Message was not in the queue');
      done();
    });
    it('Should Have a Timer to Send Messages', function (done) {
      assert.notEqual(mailer.timeout, false, 'Timeout was not set');
      done();
    });
    it('Should Return False with Empty Quotes', function (done) {
      assert.equal(mailer.queue({ text: `` }), false, 'Mailer should return false with empty quotes');
      done();
    });
  });

  describe('Prepares Messages', function () {
    it('Prepares Message Subject with Date', function (done) {
      var today = new Date();
      today = `${today.getMonth() + 1}-${today.getDate()}`;
      assert.notEqual(returned_message.subject.indexOf(today), -1, 'The current date should be in the message subject');
      done();
    });
    it('Prepares Message Sender to no-reply@funnode.com', function (done) {
      assert.equal(returned_message.from, 'no-reply@funnode.com', 'Message \'from\' is not \'no-reply@funnode.com\'');
      done();
    });
    it('Sets Message Prepared Flag', function (done) {
      assert.equal(returned_message.prepared, true, 'message.prepared flag should be set to true after being prepared');
      done();
    });
  });

  describe('Sends Queued Messages', function () {
    it('Queue should accept 2 messages', function (done) {
      var msg2 = { 'text': 'test message 2' };
      mailer.queue(msg2);
      assert.equal(mailer.queued.length, 2, 'Mailer did not queue the second message');
      done();
    });
    it('Queue should send the 2 messages', function (done) {
      this.timeout(mailer.time_interval + 500);
      console.log('This next test may take ' + (mailer.time_interval + 100) / 1000 + 'seconds')
      setTimeout(function () {
        assert.equal(mailer.queued.length, 0, 'Mailer kept the messages in its queue, message likely not sent');
        done();
      }, mailer.time_interval + 50);
    });
  });
});
