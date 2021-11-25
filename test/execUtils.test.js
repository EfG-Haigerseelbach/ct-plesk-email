var chai = require('chai');
var expect = chai.expect;    // Using Expect style
const { createLogger, format, transports, exceptions } = require('winston');

var ExecUtils = require('../execUtils.js');

const { fail } = require('assert');

const logger = createLogger({
    level: 'error',
    format: format.json(),
    transports: [
        new transports.Console({ format: format.simple(), }),
    ],
});
logger.transports.forEach((t) => (t.silent = true));


describe('execUtils', function () {
    it('should be perform some valid command', async () => {
        // Given

        // When
        var value = await ExecUtils.execute(logger, 'echo "test"');
        expect(value).to.be.not.undefined;
    });
    it('should be able to handle an invalid command', async () => {
        // Given

        // When
        var value = await ExecUtils.execute(logger, 'ohce bla');
        expect(value).to.be.undefined;
    });
    it('should be able to call sudo-mock using the default test case', async () => {
        // Given
        process.env['TEST_CASE'] = 'default';

        // When
        var value = await ExecUtils.execute(logger, 'plesk test');
        expect(value).to.be.equal('works', 'value is expected to be "works" but is "' + value + '"');

    });
    it('should be able to call sudo-mock using the another test case', async () => {
        // Given
        process.env['TEST_CASE'] = 'case1';

        // When
        var value = await ExecUtils.execute(logger, 'plesk test');
        expect(value).to.be.equal('works also for case1', 'value is expected to be "works" but is "' + value + '"');

    });

    it('should be able to call sudo-mock using a command with forbidden chars (<>)', async () => {
        // Given
        process.env['TEST_CASE'] = 'case1';

        // When
        var value = await ExecUtils.execute(logger, 'plesk test <');
        if(!(value === undefined)) {
            fail(`in case the command results in a syntax error the returned value shall be undefined`);
        }
    });
    it('should be able to call sudo-mock using a command with forbidden chars (<>)', async () => {
        // Given
        process.env['TEST_CASE'] = 'notexisting';

        // When
        var value = await ExecUtils.execute(logger, 'plesk test');
        if(!(value === undefined)) {
            fail(`in case the command outputs an error (stderr) the returned value shall be undefined`);
        }
    });
});