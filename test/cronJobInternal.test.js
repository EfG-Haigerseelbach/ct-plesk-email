process.env.NODE_ENV = 'test'
var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;    // Using Expect style
var sinon = require("sinon");
const path = require("path");
var config = require('config');

var ExecUtils = require('../execUtils.js');
const fs = require('fs');

const CronJob = require('../cronJobInternal.js');
const { fail } = require('assert');

describe('cron Job (main)', function () {
    var execUtilsExecuteStub;
    var fsReadFileSyncStub;

    beforeEach(function (done) {
        execUtilsExecuteStub = sinon.stub(ExecUtils, 'execute');
        fsReadFileSyncStub = sinon.stub(fs, 'readFileSync');
        mockedMailboxes = [];
        inputDataMocked = [];
        done();
    });

    this.afterEach(function (done) {
        if (!(fs.readFileSync.restore === undefined)) {
            fs.readFileSync.restore();
        }
        if (!(ExecUtils.execute.restore === undefined)) {
            ExecUtils.execute.restore();
        }
        mockedMailboxes = [];
        inputDataMocked = [];
        done();
        sinon.restore();
    });

    it('should be handle the case when there are three governed mailboxes which are named in the input data to be governed', async () => {
        // Given
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail1", true, false);
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail2", true, false);
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail3", true, false);
        prepareStubForGettingListOfMailboxes(execUtilsExecuteStub);

        givenInputDataEntry("some", "mail1", "some.mail1@externalDomain", "whatever");
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
    });

    it('given 2 governed mailboxes & 3 mailboxes in the input data & creation of the non-governed mailbox works successfully', async () => {
        // Given
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail1", true, false);
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail2", true, false);
        prepareStubForGettingListOfMailboxes(execUtilsExecuteStub);

        givenInputDataEntry("some", "mail1", "some.mail1@externaldomain", "whatever");
        givenInputDataEntry("some", "mail2", "some.mail2@externaldomain", "whatever");
        givenInputDataEntry("some", "mail3", "some.mail3@externaldomain", "Forwarding to some.mail3");
        prepareStubFsReadFileSync(fsReadFileSyncStub);

        var person = {
            "id": 1,
            "firstName": "some",
            "lastName": "mail3",
            "type": config.tags.forwarding_mailbox,
            "targetEmail": "some.mail3@externaldomain",
            "description": "Forwarding to some.mail3"
        };
        person.emailAddress = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@${config.domainForGovernedMailboxes}`;

        execUtilsExecuteStub.withArgs(sinon.match.any, `plesk bin mail --create ${person.emailAddress} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} -description 'Auto-maintained mail box for ${person.description}'`)
            .returns(`\nSUCCESS: Creation of mailname '${person.emailAddress}' complete`);

        // When
        var value = await CronJob.main();
        expect(value.success).to.be.true;
        expect(value.details.countOfGovernedMailboxesBefore).to.equal(2);
        expect(value.details.countOfGovernedMailboxesAfter).to.equal(3);
        expect(value.details.issues.length).to.equal(0);
        expect(value.details.newGovernedMailboxes.length).to.equal(1);
    });

    it('given 2 governed mailboxes & 3 mailboxes in the input data & creation of the non-governed mailbox fails', async () => {
        // Given
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail1", true, false);
        givenSomeMailbox(execUtilsExecuteStub, config.domainForGovernedMailboxes, "externaldomain", "some", "mail2", true, false);
        prepareStubForGettingListOfMailboxes(execUtilsExecuteStub);

        givenInputDataEntry("some", "mail1", "some.mail1@externaldomain", "whatever");
        givenInputDataEntry("some", "mail2", "some.mail2@externaldomain", "whatever");
        givenInputDataEntry("some", "mail3", "some.mail3@externaldomain", "Forwarding to some.mail3");
        prepareStubFsReadFileSync(fsReadFileSyncStub);

        var person = {
            "id": 1,
            "firstName": "some",
            "lastName": "mail3",
            "type": config.tags.forwarding_mailbox,
            "targetEmail": "some.mail3@externaldomain",
            "description": "Forwarding to some.mail3"
        };
        person.emailAddress = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@${config.domainForGovernedMailboxes}`;

        execUtilsExecuteStub.withArgs(sinon.match.any, `plesk bin mail --create ${person.emailAddress} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} -description 'Auto-maintained mail box for ${person.description}'`)
            .returns(`\nFAILURE: Creation of mailname '${person.emailAddress}' failed`);

        // When
        var value = await CronJob.main();
        expect(value.success).to.be.true;
        expect(value.details.countOfGovernedMailboxesBefore).to.equal(2);
        expect(value.details.countOfGovernedMailboxesAfter).to.equal(2);
        expect(value.details.issues.length).to.equal(1);
        expect(value.details.newGovernedMailboxes.length).to.equal(0);
    });
});


function givenSomePersonObject() {
    var person = {
        "id": 1,
        "firstName": "Max",
        "lastName": "Mustermann",
        "type": config.tags.forwarding_mailbox,
        "targetEmail": "max.mustermann@example.org",
        "description": "Forwarding mailbox for Max Mustermann"
    };
    person.emailAddress = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@example.org`;
    return person;
}



function prepareSomeInputDataJson(id = 567, firstName = "Max", lastName = "Mustermann") {
    var tmp = [
        {
            "id": id,
            "firstName": firstName,
            "lastName": lastName,
            "mailbox": `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
            "password": "",
            "targetEmail": `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.org`,
            "description": `Weiterleitungs-Postfach fuer ${firstName}.${lastName}`
        }
    ];
    return JSON.stringify(tmp);
}

var mockedMailboxes = [];

function prepareStubForGettingListOfMailboxes(stub) {
    var tmp = [];
    for (var i in mockedMailboxes) {
        tmp.push({ "type": "mailname", "name": mockedMailboxes[i] });
    }

    stub.withArgs(sinon.match.any, `plesk bin mail -l -json`)
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
function givenSomeMailbox(stub, domain = config.domainForGovernedMailboxes, externalDomain = "externaldomain",
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

    stub.withArgs(sinon.match.any, `plesk bin mail -i ${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`).returns(execMockOutput);

    mockedMailboxes.push(`${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`);
}

var inputDataMocked = [];
var inputDataIdCounter = 1;


function prepareStubFsReadFileSync(stub) {
    stub.withArgs('inputDataForCronJob.json').returns(JSON.stringify(inputDataMocked));
}

function givenInputDataEntry(firstName = "SomeFirstName", lastName = "SomeLastName", 
    targetEmail = "mail@example.org", description = "description", type = config.tags.forwarding_mailbox) {
    var entry = {
        "id": inputDataIdCounter++,
        "firstName": firstName,
        "lastName": lastName,
        "type": type,
        "emailPrefix": firstName.toLowerCase() + '.' + lastName.toLowerCase(),
        //"mailbox": firstName.toLowerCase() + '.' + lastName.toLowerCase(),
        "password": "AlwaysTheSame123.",
        "targetEmail": targetEmail,
        "description": description
    };
    inputDataMocked.push(entry);
}