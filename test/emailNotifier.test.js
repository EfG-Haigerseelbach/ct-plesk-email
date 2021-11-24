var chai = require('chai');
var expect = chai.expect;    // Using Expect style
var sinon = require("sinon");
var EmailNotifier = require('../emailNotifier.js');
var Mailer = require('nodemailer/lib/mailer');

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'error',
    format: format.json(),
    transports: [
        new transports.Console({ format: format.simple(), }),
    ],
});
logger.transports.forEach((t) => (t.silent = true));

describe('emailNotifier', function () {
    var mailerStub;

    beforeEach(function (done) {
        mailerStub = sinon.stub(Mailer.prototype, 'sendMail');
        done();
    });

    this.afterEach(function (done) {
        sinon.restore();
        done();
    });

    it('should be able sent an email', async () => {
        // Given
        var info = { messageId : '123' };
        mailerStub.withArgs(sinon.match.any).returns(Promise.resolve(info));

        var recipientsEmailAddresses = 'test@example.org';
        var subject = "E-mail Notification Configuration Test ✔";
        var text = "This is a test e-mail to check whether the configuration is fine.";
        var html = "This is a test e-mail to check whether the configuration is fine.";

        // When
        var value = await EmailNotifier.send(logger, recipientsEmailAddresses, subject, text, html);
        expect(value).to.be.true;
    });
    
    it('should be able to handle errors during sending an email', async () => {
        // Given
        mailerStub.withArgs(sinon.match.any).returns(Promise.reject('some error'));

        var recipientsEmailAddresses = 'test@example.org';
        var subject = "E-mail Notification Configuration Test ✔";
        var text = "This is a test e-mail to check whether the configuration is fine.";
        var html = "This is a test e-mail to check whether the configuration is fine.";

        // When
        var value = await EmailNotifier.send(logger, recipientsEmailAddresses, subject, text, html);
        expect(value).to.be.false;
    });   
});