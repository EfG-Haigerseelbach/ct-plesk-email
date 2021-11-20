var config = require('config');

const { churchtoolsClient, activateLogging, LOG_LEVEL_ERROR, LOG_LEVEL_DEBUG, LOG_LEVEL_INFO, errorHelper } = require('@churchtools/churchtools-client');
const axiosCookieJarSupport = require('axios-cookiejar-support');
const tough = require('tough-cookie');
const fs = require('fs');

const PromisePool = require('@supercharge/promise-pool');

var crypto = require('crypto');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// Create a unique ID for the current execution of cronJob.js
// This ID is used as label for all log messages and eases to 
// find log messages which origin from the same execution.
var executionId = new Date().toISOString().slice(0, 16);
executionId = crypto.createHash("md5").update(executionId).digest("hex");

// Create an log message format
const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [execId:${label}] ${level}: ${message}`;
});

const logger = createLogger({
    level: config.logging.index,
    format: format.combine(
        label({ label: executionId }),
        timestamp(),
        myFormat
    ),
    transports: [ // Output log messages at the console as well as to a file
        new transports.Console({ format: format.simple(), }),
        new transports.File({ filename: 'cronJob.log' }),
    ],
});

function initChurchToolsClient() {
    churchtoolsClient.setCookieJar(axiosCookieJarSupport.default, new tough.CookieJar());
    churchtoolsClient.setBaseUrl(config.churchtools_api.url);
    // Logging can be activated to either LOG_LEVEL_NONE (no logging at all, default),
    // LOG_LEVEL_NONE: do not log at all
    // LOG_LEVEL_DEBUG (outputs every request and response including request/response data)
    // LOG_LEVEL_INFO (outputs every request and response, but only method and URL) or
    // LOG_LEVEL_ERROR (outputs only errors).
    activateLogging(config.churchtools_api.log_level);
}

/**
 * Login to ChurchTools API with the given username and password
 * @param {*} username 
 * @param {*} password 
 * @returns promise
 */
function login(username, password) {
    return churchtoolsClient.post('/login', {
        username,
        password
    });
}

/**
 * Array of all persons.
 */
var personStore = [];

/**
 * Get the index of the person for the given id in the array of all persons.
 * @param {number} id person's id
 * @returns {number} index or undefined if there is no such id
 */
function getIndexOfPersonById(id) {
    for (i in personStore) {
        if (personStore[i].id == id) {
            return i;
        }
    }
}

/**
 * Get the person for the given id in the array of all persons.
 * @param {number} id person's id
 * @returns {object} person or undefined if there is no such person
 */
 function getPersonById(id) {
    for (i in personStore) {
        if (personStore[i].id == id) {
            return personStore[i];
        }
    }
}

/**
 * Check if the given list of tags contains tag 'email'
 * @param {array} tags Array of tags (item type string)
 * @returns {Boolean} true in case there is a tag 'email', otherwise false
 */
function hasEmailTag(tags) {
    for (var i = 0; i < tags.length; i++) {
        if (tags[i].name.toLowerCase() == config.tags.forwarding_mailbox.toLowerCase() ||
            tags[i].name.toLowerCase() == config.tags.mailbox.toLowerCase()) {
            return true;
        }
    }
    return false;
}

/**
 * Check the email-related tags are valid
 * @param {array} tags Array of tags (item type string)
 * @returns {Boolean} true in case all email-related tags are valid, otherwise false
 */
 function checkEmailTags(tags) {
    var forwardingMailboxSpecified = false;
    var mailboxSpecified = false;
    for (var i = 0; i < tags.length; i++) {
        if (tags[i].name.toLowerCase() == config.tags.forwarding_mailbox.toLowerCase()) {
            forwardingMailboxSpecified = true;
        } else if(tags[i].name.toLowerCase() == config.tags.mailbox.toLowerCase()) {
            mailboxSpecified = true;
        }
    }
    return !(forwardingMailboxSpecified && mailboxSpecified);
}

/**
 * Check if the given list of tags contains tag 'email'
 * @param {array} tags Array of tags (item type string)
 * @returns {Boolean} true in case there is a tag 'email', otherwise false
 */
 function getEmailTag(tags) {
    for (var i = 0; i < tags.length; i++) {
        if (tags[i].name.toLowerCase() == config.tags.forwarding_mailbox.toLowerCase()) {
            return config.tags.forwarding_mailbox;
        } else if(tags[i].name.toLowerCase() == config.tags.mailbox.toLowerCase()) {
            return config.tags.mailbox;
        }
    }
}

/**
 * Get tags of the person matching the given id from from the API
 * @param {number} personId 
 * @returns {object} promise
 */
function getTagsOfPerson(personId) {
    return churchtoolsClient.get(`/persons/${personId}/tags`).then(personTags => {
        var index = getIndexOfPersonById(personId);

        if(!checkEmailTags(personTags)) {
            var personWithInvalidEmailTags = getPersonById(personId);
            logger.error(`The email-related tags for person with id ${personId} (${personWithInvalidEmailTags.firstName} ${personWithInvalidEmailTags.lastName}) are invalid. Please check.`);
            return;
        }
        if (personTags.length > 0) {
            personStore[index].tags = personTags;
            personStore[index].hasEmailTag = hasEmailTag(personTags);
            if(personStore[index].hasEmailTag) {
                personStore[index].emailTag = getEmailTag(personTags)
            }
        } else {
            personStore[index].tags = [];
            personStore[index].hasEmailTag = false;
        }
    });
}

/**
 * Create a JSON-file which serves as input for the cron job to govern mailboxes
 * @param {array} personStore array which contains all persons
 */
function createFileWithInputDataForCronJob(personStore) {
    var content = [];
    // Process each person
    for (var i in personStore) {
        // Check if the person has the email tag
        if (personStore[i].hasEmailTag) {
            // Provide information for cron job
            content.push({
                id: personStore[i].id,
                type: personStore[i].emailTag,
                firstName: personStore[i].firstName.replace(/[^0-9A-Za-z]/g, ''),
                lastName: personStore[i].lastName.replace(/[^0-9A-Za-z]/g, ''),
                targetEmail: personStore[i].email,
                description: `${personStore[i].firstName} ${personStore[i].lastName}`
            });
        }
    }
    fs.writeFileSync('./inputDataForCronJob.json', JSON.stringify(content, null, 4));
}

function main(callback) {
    initChurchToolsClient();
    login(config.churchtools_api.username, config.churchtools_api.password).then(() => {
        logger.info('Login successful.');
        logger.info(`Querying for all persons...`)
        return churchtoolsClient.get('/persons?limit=500').then(persons => {
            logger.info(`Received #${persons.length} person(s)`);
            for (var i in persons) {
                personStore.push({ id: persons[i].id, firstName: persons[i].firstName, lastName: persons[i].lastName, email: persons[i].email });
            }
        });
    }).then(() => {
        // const { results, errors } = await PromisePool
        logger.info(`Querying the tags of all received persons sequentially...`);
        PromisePool
            .withConcurrency(2)
            .for(personStore)
            .process(async (person, index) => {
                await getTagsOfPerson(person.id);
                var progressPercentage = Math.round(((index / personStore.length) + Number.EPSILON) * 100);
                if (progressPercentage % 25 == 0) {
                    logger.debug(progressPercentage);
                }
                if (index == personStore.length - 1) {
                    createFileWithInputDataForCronJob(personStore);
                    logger.info('Querying the tags...COMPLETED');
                    callback();
                }
            });
    }).catch(error => {
        // getTranslatedErrorMessage returns a human readable translated error message
        // from either a full response object, response data or Exception or Error instances.
        logger.error(errorHelper.getTranslatedErrorMessage(error));
    });
}
main(()=>{});
module.exports = {
    main: main
}