var sinon = require("sinon");

const CronJobInternal = require('../cronJobInternal.js');

describe('cron Job (main)', function () {
    
    var cronJobInternalStub;
    
    beforeEach(function (done) {
        cronJobInternalStub = sinon.stub(CronJobInternal, 'main');
        done();
    });

    this.afterEach(function (done) {
        sinon.restore();
        done();
    });

    it('should be handle the case when there are three governed mailboxes which are named in the input data to be governed', async () => {
        // Given
        cronJobInternalStub.returns(true);
        // When
        const cronJob = require('../cronJob.js');
        // Then 
        // no dump
    });
});