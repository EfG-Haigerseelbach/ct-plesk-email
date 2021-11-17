var chai = require('chai');
var expect = chai.expect;    // Using Expect style
var sinon = require("sinon");
const path = require("path");

var ExecUtils = require('../execUtils.js');
const fs = require('fs');

const CronJob = require('../cronJobInternal.js');

describe('cron Job (individual functions)', function () {
    var execUtilsExecuteStub;


    beforeEach(function (done) {
        execUtilsExecuteStub = sinon.stub(ExecUtils, 'execute');

        var dummyContent = [
            {
                "id": 1,
                "firstName": "SomeFirstName",
                "lastName": "SomeLastName",
                "mailbox": "some.prefix",
                "targetEmail": "mail@test.org",
                "description": "description"
            }
        ];
        dummyContent = JSON.stringify(dummyContent, null, 4);

        sinon.stub(fs, 'readFileSync').withArgs('inputDataForCronJob.json').returns(dummyContent);

        mockedMailboxes = [];
        done();
    });

    this.afterEach(function (done) {
        fs.readFileSync.restore();
        if (!(ExecUtils.execute.restore === undefined)) {
            ExecUtils.execute.restore();
        }
        mockedMailboxes = [];
        done();
        sinon.restore();
    });

    it('should be able get mailbox details for a mailbox which exists', async () => {
        // Given
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail", true, false);
        prepareStubForGettingListOfMailboxes(execUtilsExecuteStub);

        // When
        var value = await CronJob.getMailboxDetails(mockedMailboxes[0]);
        expect(value).to.be.not.undefined;
        expect(value).to.have.a.property('mailname');
        expect(value).to.have.a.property('domain');
        expect(value).to.have.a.property('mailbox');
        expect(value).to.have.a.property('passwordType');
        expect(value).to.have.a.property('mailboxQuota');
        expect(value).to.have.a.property('mailgroup');
        expect(value).to.have.a.property('groupMembers');
        expect(value).to.have.a.property('attachmentFiles');
        expect(value).to.have.a.property('autoresponders');
        expect(value).to.have.a.property('description');
    });

    it('should be able to handle not expected output of command "sudo plesk bin mail -i"', async () => {
        // Given
        var execMockOutput =
            'some bad output';
        execUtilsExecuteStub.returns(execMockOutput);

        // When
        var value = await CronJob.getMailboxDetails('mail@externaldomain');
        expect(value).to.be.undefined;
    });
    it('should be able to get all mailboxes incl. their details', async () => {
        // Given
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

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -l -json`).returns('[{"type":"mailname","name":"mail@domain"}]');
        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -i mail@domain`).returns(execMockOutput);

        // When
        var mailboxes = await CronJob.getMailboxes();
        expect(mailboxes).to.be.not.undefined;
        expect(mailboxes).to.have.lengthOf(1, 'there should be one mailbox determined');
        expect(mailboxes[0]).to.have.a.property('details');
    });
    it('should be able to get all mailboxes even if no details are available', async () => {
        // Given
        var execMockOutput =
            'some bad output';

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -l -json`).returns('[{"type":"mailname","name":"mail@domain"}]');
        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -i mail@domain`).returns(execMockOutput);

        // When
        var mailboxes = await CronJob.getMailboxes();
        expect(mailboxes).to.be.not.undefined;
        expect(mailboxes).to.have.lengthOf(1, 'there should be one mailbox determined');
        expect(mailboxes[0]).to.have.a.property('details');
        expect(mailboxes[0].details).to.be.undefined;
    });
    it('should be able to handle unexpected JSON output when getting all mailboxes', async () => {
        // Given
        //var execMockOutput =
        //    'some bad output';

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -l -json`).returns('[{"unexpected":"attribute","typ":"mailname","nam":"mail@domain"}]');
        //execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -i mail@domain`).returns(execMockOutput);

        // When
        var mailboxes = await CronJob.getMailboxes();
        expect(mailboxes).to.be.undefined;
    });
    it('should be able to get all governed mailboxes incl. their details', async () => {
        // Given
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail1", false, false);
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail2", false, false);
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail3", true, false);
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail4", true, false);
        givenSomeMailbox(execUtilsExecuteStub, "domain", "externaldomain", "some", "mail5", true, true);

        prepareStubForGettingListOfMailboxes(execUtilsExecuteStub);

        // When
        var governedMailboxes = await CronJob.getGovernedMailboxes();
        expect(governedMailboxes).to.be.not.undefined;
        expect(governedMailboxes).to.have.lengthOf(2, 'there should be one mailbox determined');
        expect(governedMailboxes[0]).to.have.a.property('details');
        expect(governedMailboxes[0].details).not.to.be.undefined;
        expect(governedMailboxes[1]).to.have.a.property('details');
        expect(governedMailboxes[1].details).not.to.be.undefined;
    });
    it('should be able to create a mailbox', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail --create ${person.mailbox} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} -description 'Auto-maintained mail box for ${person.description}'`)
            .returns(`\nSUCCESS: Creation of mailname '${person.mailbox}' complete`);

        // When
        var mailboxCreated = await CronJob.createMailbox(person);
        // Then
        expect(mailboxCreated).to.be.true;
    });
    it('should be able to handle a failure when creating a mailbox', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail --create ${person.mailbox} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} -description 'Auto-maintained mail box for ${person.description}'`)
            .returns(`\nFAILURE: Creation of mailname '${person.mailbox}' failed`);

        // When
        var mailboxCreated = await CronJob.createMailbox(person);
        // Then
        expect(mailboxCreated).to.be.false;
    });
    it('should be able to handle a failure when creating a mailbox (no output of command execution)', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail --create ${person.mailbox} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} -description 'Auto-maintained mail box for ${person.description}'`)
            .returns(undefined);

        // When
        var mailboxCreated = await CronJob.createMailbox(person);
        // Then
        expect(mailboxCreated).to.be.false;
    });
    it('should be able to remove a mailbox', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -r ${person.mailbox}`)
            .returns(`\nSUCCESS: Removal of '${person.mailbox}' complete`);

        // When
        var mailboxRemoved = await CronJob.removeMailbox(person);
        // Then
        expect(mailboxRemoved).to.be.true;
    });
    it('should be able to handle a failure when removing a mailbox', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -r ${person.mailbox}`)
            .returns(`\nFAILURE: Removal of '${person.mailbox}' failed`);

        // When
        var mailboxRemoved = await CronJob.removeMailbox(person);
        // Then
        expect(mailboxRemoved).to.be.false;
    });
    it('should be able to handle a failure when removing a mailbox (no output of command execution)', async () => {
        // Given
        var person = {
            "id": 1,
            "firstName": "Johannes",
            "lastName": "Gilbert",
            "mailbox": "johannes.gilbert",
            "targetEmail": "johannes.gilbert@posteo.de",
            "description": "Weiterleitungs-Postfach fuer Johannes Gilbert"
        };
        var mailbox = `${person.mailbox}@efghaigerseelbach.de`;
        person.mailbox = mailbox;

        execUtilsExecuteStub.withArgs(sinon.match.any, `sudo plesk bin mail -r ${person.mailbox}`)
            .returns(undefined);

        // When
        var mailboxRemoved = await CronJob.removeMailbox(person);
        // Then
        expect(mailboxRemoved).to.be.false;
    });
    it('should be able to check for whether or not a mailbox is governed', function (done) {
        // Given
        var governedMailboxes = [{ "type": "mailname", "name": "mail1@domain" }, { "type": "mailname", "name": "mail2@domain" },
        { "type": "mailname", "name": "mail3@domain" }, { "type": "mailname", "name": "mail4@domain" },
        { "type": "mailname", "name": "mail5@domain" }];

        // When
        var mail1Governed = CronJob.isMailboxGoverned(governedMailboxes, 'mail1@domain');
        var mail99Governed = CronJob.isMailboxGoverned(governedMailboxes, 'mail9@domain');
        // Then
        expect(mail1Governed).to.be.true;
        expect(mail99Governed).to.be.false;
        done();
    });
    it('should be able to check for whether or not a mailbox is governed when there are no governed mailboxes', function (done) {
        // Given
        var governedMailboxes = [];

        // When
        var mail1Governed = CronJob.isMailboxGoverned(governedMailboxes, 'mail1@domain');
        var mail99Governed = CronJob.isMailboxGoverned(governedMailboxes, 'mail9@domain');
        // Then
        expect(mail1Governed).to.be.false;
        expect(mail99Governed).to.be.false;
        done();
    });
});


describe('cron Job (readInputData)', function () {
    it('should be able to read inputDataForCronJob.json when it contains valid JSON content', function (done) {
        // Given
        var exists = false;
        if (fs.existsSync(path.resolve(__dirname, '../inputDataForCronJob.json'))) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            exists = true;
        }
        fs.writeFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), '[{"foo":"bar"}]');

        // When
        var content = CronJob.readInputData();
        expect(content).to.be.not.undefined;

        // Finally
        if (exists) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'), path.resolve(__dirname, '../inputDataForCronJob.json'));
            fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            done();
        } else {
            done();
        }
    });
    it('should be able to read inputDataForCronJob.json when it contains *in*valid JSON content', function (done) {
        // Given
        var exists = false;
        if (fs.existsSync(path.resolve(__dirname, '../inputDataForCronJob.json'))) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            exists = true;
        }
        fs.writeFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), '[this{"is:"invalid"}]');

        // When
        var content = CronJob.readInputData();
        expect(content).to.be.undefined;
        // Finally
        if (exists) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'), path.resolve(__dirname, '../inputDataForCronJob.json'));
            fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            done();
        } else {
            done();
        }
    });
    it('should be able to handle the case when inputDataForCronJob.json does not exist', function (done) {
        // Given
        var exists = false;
        if (fs.existsSync(path.resolve(__dirname, '../inputDataForCronJob.json'))) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json'));
            exists = true;
        }

        // When
        var content = CronJob.readInputData();
        expect(content).to.be.undefined;

        // Finally
        if (exists) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'), path.resolve(__dirname, '../inputDataForCronJob.json'));
            fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            done();
        } else {
            done();
        }
    });
    it('main() should be able to handle no/ missing input data', function (done) {
        // Given
        var exists = false;
        if (fs.existsSync(path.resolve(__dirname, '../inputDataForCronJob.json'))) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            exists = true;
        }
        fs.writeFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'), '');

        // When
        CronJob.main().then((content) => {
            expect(content.success).to.be.false;
        }, (reason) => {
            expect.fail(reason);
        }).then(() => {
            // Finally
            if (exists) {
                fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'), path.resolve(__dirname, '../inputDataForCronJob.json'));
                fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
                done();
            } else {
                done();
            }
        });
    });
    /*it('main() should be able to handle one existing governed mailbox and one new to-be-governed mailbox', function (done) {
        // Given
        var exists = false;
        if(fs.existsSync(path.resolve(__dirname, '../inputDataForCronJob.json'))) {
            fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'),path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
            exists = true;
        }
        fs.writeFileSync(path.resolve(__dirname, '../inputDataForCronJob.json'),prepareSomeInputDataJson());
        
        // When
        CronJob.main().then((content) => {
            expect(content.success).to.be.false;
        }, (reason) => {
            expect.fail(reason);
        }).then(() => {
            // Finally
            if(exists) {
                fs.copyFileSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'),path.resolve(__dirname, '../inputDataForCronJob.json'));
                fs.unlinkSync(path.resolve(__dirname, '../inputDataForCronJob.json.bak'));
                done();
            } else {
                done();
            }
        });
    });*/
});

var mockedMailboxes = [];

function prepareStubForGettingListOfMailboxes(stub) {
    var tmp = [];
    for (var i in mockedMailboxes) {
        tmp.push({ "type": "mailname", "name": mockedMailboxes[i] });
    }

    stub.withArgs(sinon.match.any, `sudo plesk bin mail -l -json`)
        .returns(JSON.stringify(tmp));
}

/**
 * Mocks mailbox details returned by 'sudo plesk bin mail -i mailbox@domain'
 * 
 * @param {object} stub sinon.stub for ExecUtils.execute
 * @param {string} domain domain output at sudo plesk bin mail -i  
 * @param {string} externalDomain external domain output at sudo plesk bin mail -i 
 * @param {string} firstName first name output in the description
 * @param {string} lastName last name output in the description
 * @param {boolean} governed if true the description starts with 'Auto-maintained'
 * @param {boolean} simulateFailure if true the output ends with SUCCESS, otherwise it ends with FAILURE
 */
function givenSomeMailbox(stub, domain = "domain", externalDomain = "externaldomain",
    firstName = "Max", lastName = "Mustermann", governed = true, simulateFailure = false) {
    var descriptionPart = 'Auto-maintained';
    if (!governed) {
        descriptionPart = 'Some'
    }

    var successOrFailure = 'SUCCESS';
    if (simulateFailure) {
        successOrFailure = 'FAILURE';
    }

    var execMockOutput =
        'Mailname:           test\n' +
        `Domain:             ${domain}\n` +
        'Mailbox:            false\n' +
        'Password type:      sym\n' +
        'Mbox quota:         Default value (Unlimited)\n' +
        'Mailgroup:          true\n' +
        `Group member(s):    ${firstName.toLowerCase()}.${lastName.toLowerCase()}@${externalDomain} \n` +
        'Attachment files:   Empty\n' +
        'Autoresponders:     Disabled\n' +
        `Description:        ${descriptionPart} mail box for ${firstName} ${lastName}\n` +
        ' \n' +
        `${successOrFailure}: Gathering information for '${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}' complete`;

    stub.withArgs(sinon.match.any, `sudo plesk bin mail -i ${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`).returns(execMockOutput);

    mockedMailboxes.push(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`);
}