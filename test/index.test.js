var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;    // Using Expect style
var sinon = require("sinon");
const fs = require('fs');
var config = require('config');

const { churchtoolsClient, activateLogging, LOG_LEVEL_ERROR, errorHelper } = require('@churchtools/churchtools-client');

const Main = require('../index.js');
const { fail } = require('assert');

describe('Querying CT', function () {

    var churchtoolsClientPostStub;
    var churchtoolsClientGetStub;
    var fsReadFileSyncStub;

    before(function (done) {
        churchtoolsClientPostStub = sinon.stub(churchtoolsClient, 'post');
        churchtoolsClientGetStub = sinon.stub(churchtoolsClient, 'get');
        fsReadFileSyncStub = sinon.stub(fs, 'writeFileSync');
        done();
    });

    this.afterEach(function (done) {
        
        //sinon.restore();
        done();
    });

    it('should be handle the case when there are three persons with no email tag but some other tag', async (done) => {
        // Given
        churchtoolsClientPostStub.withArgs('/login', sinon.match.any).returns(Promise.resolve(true));
        var data = [
            { id: 1, firstName: 'firstName1', lastName: 'lastName1', email: 'firstname1.lastName1@example.org' },
            { id: 2, firstName: 'firstName2', lastName: 'lastName2', email: 'firstname2.lastName2@example.org' },
            { id: 3, firstName: 'firstName3', lastName: 'lastName3', email: 'firstname3.lastName3@example.org' },
        ];
        churchtoolsClientGetStub.withArgs('/persons?limit=500').returns(Promise.resolve(data));

        churchtoolsClientGetStub.withArgs(`/persons/1/tags`).returns(Promise.resolve([{name: 'ABC'}]));
        churchtoolsClientGetStub.withArgs(`/persons/2/tags`).returns(Promise.resolve([{name: 'ABC'}]));
        churchtoolsClientGetStub.withArgs(`/persons/3/tags`).returns(Promise.resolve([{name: 'ABC'}]));

        fsReadFileSyncStub.withArgs('./inputDataForCronJob.json',sinon.match.any).returns(true);

        // When
        Main.main(()=> {
            // Then
            expect(fsReadFileSyncStub.getCall(0).args.length).to.equal(2)
            expect(fsReadFileSyncStub.getCall(0).args[1]).to.be.an('array').that.is.empty;
            
        });
        done();
    });

    it('should be handle the case when there are three persons where as one has an email tag and the others have no email tag but some other tag', async (done) => {
        // Given
        churchtoolsClientPostStub.withArgs('/login', sinon.match.any).returns(Promise.resolve(true));
        var data = [
            { id: 1, firstName: 'firstName1', lastName: 'lastName1', email: 'firstname1.lastName1@example.org' },
            { id: 2, firstName: 'firstName2', lastName: 'lastName2', email: 'firstname2.lastName2@example.org' },
            { id: 3, firstName: 'firstName3', lastName: 'lastName3', email: 'firstname3.lastName3@example.org' },
        ];
        churchtoolsClientGetStub.withArgs('/persons?limit=500').returns(Promise.resolve(data));

        churchtoolsClientGetStub.withArgs(`/persons/1/tags`).returns(Promise.resolve([{name: 'ABC'}]));
        churchtoolsClientGetStub.withArgs(`/persons/2/tags`).returns(Promise.resolve([]));
        churchtoolsClientGetStub.withArgs(`/persons/3/tags`).returns(Promise.resolve([{name: config.tags.forwarding_mailbox.toLowerCase()}]));

        fsReadFileSyncStub.withArgs('./inputDataForCronJob.json',sinon.match.any).returns(true);

        // When
        Main.main(()=> {
            // Then
            expect(fsReadFileSyncStub.getCall(0).args.length).to.equal(2)
            expect(fsReadFileSyncStub.getCall(0).args[1]).to.be.an('array').that.is.not.empty;
            
        });
        done();
    });
});