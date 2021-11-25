var chai = require('chai');
var expect = chai.expect;    // Using Expect style
var sinon = require("sinon");
const path = require("path");

var ExecUtils = require('../execUtils.js');
const fs = require('fs');

const CronJob = require('../cronJobInternal.js');
const { fail } = require('assert');

describe('cron Job (main using sudo-mock)', function () {

    var fsReadFileSyncStub;

    beforeEach(function (done) {
        fsReadFileSyncStub = sinon.stub(fs, 'readFileSync');
        inputDataMocked = [];
        done();
    });

    this.afterEach(function (done) {
        if (!(ExecUtils.execute.restore === undefined)) {
            ExecUtils.execute.restore();
        }
        if (!(fs.readFileSync.restore === undefined)) {
            fs.readFileSync.restore();
        }
        inputDataMocked = [];
        sinon.restore();
        done();
    });

    step('should be handle the case when there are three governed mailboxes which are named in the input data to be governed', async (done) => {
        // Given
        process.env['TEST_CASE'] = 'case11';

        givenInputDataEntry("some", "mail1", "some.mail1@externaldomain", "whatever");
        givenInputDataEntry("some", "mail2", "some.mail2@externaldomain", "whatever");
        givenInputDataEntry("some", "mail3", "some.mail3@externaldomain", "whatever");
        prepareStubFsReadFileSync(fsReadFileSyncStub);

        // When
        var value = await CronJob.main();
        expect(value.success).to.be.true;
        expect(value.details.countOfGovernedMailboxesBefore).to.equal(3);
        expect(value.details.countOfGovernedMailboxesAfter).to.equal(3);
        expect(value.details.issues.length).to.equal(0);
        expect(value.details.newGovernedMailboxes.length).to.equal(0);
        done();
    });

    step('should be handle the case when there are two governed mailboxes which are named in the input data to be governed', async (done) => {
        // Given
        process.env['TEST_CASE'] = 'case12';

        givenInputDataEntry("some", "mail1", "some.mail1@externaldomain", "whatever");
        givenInputDataEntry("some", "mail2", "some.mail2@externaldomain", "whatever");
        givenInputDataEntry("some", "mail3", "some.mail3@externaldomain", "Forwarding to some.mail3");
        prepareStubFsReadFileSync(fsReadFileSyncStub);

        // When
        var value = await CronJob.main();
        expect(value.success).to.be.true;
        expect(value.details.countOfGovernedMailboxesBefore).to.equal(2);
        expect(value.details.countOfGovernedMailboxesAfter).to.equal(3);
        expect(value.details.issues.length).to.equal(0);
        expect(value.details.newGovernedMailboxes.length).to.equal(1);
        done();
    });

    step('should be handle the case when there are two governed mailboxes which are named in the input data to be governed', async (done) => {
        // Given
        process.env['TEST_CASE'] = 'case13';

        givenInputDataEntry("some", "mail1", "some.mail1@externaldomain", "whatever");
        givenInputDataEntry("some", "mail2", "some.mail2@externaldomain", "whatever");
        givenInputDataEntry("some", "mail3", "some.mail3@externaldomain", "Forwarding to some.mail3");
        prepareStubFsReadFileSync(fsReadFileSyncStub);

        // When
        var value = await CronJob.main();
        expect(value.success).to.be.true;
        expect(value.details.countOfGovernedMailboxesBefore).to.equal(2);
        expect(value.details.countOfGovernedMailboxesAfter).to.equal(2);
        expect(value.details.issues.length).to.equal(1);
        expect(value.details.newGovernedMailboxes.length).to.equal(0);
        done();
    });

    it('should be able to get all mailboxes incl. their details', () => {
        // Given
        //process.env['TEST_CASE'] = 'case2';
        var execMockOutput =
            'Mailname:           test\n' +
            'Domain:             domain\n' +
            'Mailbox:            false\n' +
            'Password type:      sym\n' +
            'Mbox quota:         Default value (Unlimited)\n' +
            'Mailgroup:          true\n' +
            'Group member(s):    mail@externaldomain \n' +
            'Attachment files:   Empty\n' +
            'Autoresponders:     Disabled\n' +
            'Description:        Auto-maintained mail box for ${person.description}\n' +
            ' \n' +
            "SUCCESS: Gathering information for 'mail@domain' complete";

        //execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -l -json`).returns('[{"type":"mailname","name":"mail@domain"}]');
        //execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -i mail@domain`).returns(execMockOutput);

        // When
        /*var mailboxes = await CronJob.getMailboxes();
        expect(mailboxes).to.be.not.undefined;
        expect(mailboxes).to.have.lengthOf(1, 'there should be one mailbox determined');
        expect(mailboxes[0]).to.have.a.property('details');*/
    });
});