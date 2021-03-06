const fs = require('fs');
const util = require('util');
var crypto = require('crypto');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;
var passwordGenerator = require('generate-password');
var config = require('config');

var Validator = require('jsonschema').Validator;

const ExecUtils = require('./execUtils.js');
const EmailNotifier = require('./emailNotifier.js');

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
  level: config.logging.cronJobInternal, // Output all log messages (since 'debug' is the most verbose level)
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

async function main() {
  logger.info('--== Cron Job for Mailbox Governance ==--');

  var result = {};
  var content = readInputData();
  if (content === undefined || content.length == 0) {
    var msg = `No input data (or an error occurred)`;
    logger.info(msg);
    result.success = false;
    result.message = msg;
    return result;
  }

  for (var i in content) {
    content[i].firstName = content[i].firstName.replace(/[^a-zA-Z0-9\-]/g,'');
    content[i].lastName = content[i].lastName.replace(/[^a-zA-Z0-9\-]/g,'');
  }

  logger.info(`Checking for governed mailboxes...`);
  var governedMailboxes = await getGovernedMailboxes();
  logger.info(`There are ${governedMailboxes.length} governed mailboxes`);
  result.details = {};
  result.details.countOfGovernedMailboxesBefore = governedMailboxes.length;
  result.details.countOfGovernedMailboxesAfter = result.details.countOfGovernedMailboxesBefore;
  result.details.newGovernedMailboxes = [];
  result.details.issues = [];
  logger.info(`Cross-checking with the input data if there are any mailboxes to be created...`)
  for (var i in content) {
    content[i].emailAddress = `${content[i].firstName.toLowerCase()}.${content[i].lastName.toLowerCase()}@${config.domainForGovernedMailboxes}`;
    if (!isMailboxGoverned(governedMailboxes, content[i].emailAddress)) {
      // Create a random password but do not persist it
      content[i].password = passwordGenerator.generate({ length: 10, numbers: true, symbols: true, strict: true, exclude: '"' }) + crypto.randomInt(100, 999);
      var success = await createMailbox(content[i]);
      if (success) {
        result.details.newGovernedMailboxes.push(content[i].emailAddress);
        result.details.countOfGovernedMailboxesAfter++;

        if(content[i].type == config.tags.mailbox) {
          // It is a mailFor mailboxes 
          var subject = config.notification[config.language].creation_of_a_mailbox.subject;
          var text = config.notification[config.language].creation_of_a_mailbox.text;
          text = text.replace('{{emailAddress}}', content[i].emailAddress);
          text = text.replace('{{password}}',  content[i].password);
          var html = config.notification[config.language].creation_of_a_mailbox.html;
          html = html.replace('{{emailAddress}}', content[i].emailAddress);
          html = html.replace('{{password}}',  content[i].password);
          EmailNotifier.send(logger, content[i].targetEmail, subject, text, html).catch(console.error);

        } else if(content[i].type == config.tags.forwarding_mailbox) {
          var subject = config.notification[config.language].creation_of_a_forwarding_mailbox.subject;
          var text = config.notification[config.language].creation_of_a_forwarding_mailbox.text;
          text = text.replace('{{emailAddress}}', content[i].emailAddress);
          text = text.replace('{{forwardingTarget}}',  content[i].targetEmail);
          var html = config.notification[config.language].creation_of_a_forwarding_mailbox.html;
          html = html.replace('{{emailAddress}}', content[i].emailAddress);
          html = html.replace('{{forwardingTarget}}',  content[i].targetEmail);
          EmailNotifier.send(logger, content[i].targetEmail, subject, text, html).catch(console.error);
        }
      } else {
        result.details.issues.push(`Could not create governed mailbox for ${content[i].emailAddress}`);
      }
    }
  }

  result.success = true;
  return result;
}

/**
 * Read the content of file inputDataForCronJob.json
 * @returns {array} JSON
 */
function readInputData() {
  const nameOfInputFile = 'inputDataForCronJob.json';
  logger.info(`Reading ${nameOfInputFile}`);
  if (fs.existsSync(nameOfInputFile)) {
    var content = fs.readFileSync(nameOfInputFile, 'utf-8');
    try {
      content = JSON.parse(content);
    } catch (error) {
      logger.error(`File '${nameOfInputFile}' does not contain valid JSON. Please check the file.`);
      return;
    }

    logger.info(`Input data contains ${content.length} entries`);
    return content;
  } else {
    return;
  }
}

/**
 * Creates an archived as backup of the person's mailbox
 * @param {object} person - object which contains at least the attributes 'mailbox'
 * @returns {boolean} true if the backup was successful
 */
async function backupMailbox(person, dateTime = new Date().toISOString()) {
  logger.info(`Trying to backup mailbox ${person.emailAddress}...`);
  var mailboxName = `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}`;
  var command = `cd /var/qmail/mailnames/${config.domainForGovernedMailboxes} && tar -czf ${person.emailAddress}_${dateTime} ${mailboxName}/`;
  var output = await ExecUtils.execute(logger, command);
  if (output === undefined) {
    return true;
  } else if(!(output === undefined) && output.length == 0 ) {
    return true;
  } else if(!(output === undefined) && output.length > 0 ) {
    output = output.trim();
    if (output == '0') {
      return true;
    } else {
      logger.error(`Command result: ${output.replace(/\r?\n/g, '')}`);
      return false;
    }
  } else {
    return false;
  }
}

/**
 * Create a mailbox using the given person's data
 * @param {object} person - object which contains at least the attributes 'mailbox'
 * 
 * Command result:
 * SUCCESS: Removal of 'some.mailbox@example.org' complete
 * @return {boolean} true in case a mailbox could be removed, otherwise false
 */
async function removeMailbox(person) {
  logger.info(`Trying to remove mailbox ${person.emailAddress}...`);

  var command = `plesk bin mail -r ${person.emailAddress}`;
  var output = await ExecUtils.execute(logger, command);
  if (!(output === undefined)) {
    logger.debug(`Command result: ${output.replace(/\r?\n/g, '')}`);
    output = output.trim();
    if (output.startsWith('SUCCESS')) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * Create a mailbox using the given person's data
 * @param {object} person - object which contains at least the attributes 'firstName', 'lastName', 'mailbox', 
 * 'targetEmail' and 'description'
 * 
 * Command result:
 * SUCCESS: Creation of mailname '<mail>@<domain>' complete
 * @return {boolean} true in case a mailbox could be created, otherwise false
 */
async function createMailbox(person) {
  var output;
  if(person.type == config.tags.forwarding_mailbox) {
    logger.info(`Trying to create a mailbox for ${person.firstName} ${person.lastName} (forwarding)`);
    // Pass the password via environment variable (due to security reasons)
    var command = `plesk bin mail --create ${person.emailAddress} -passwd '' -forwarding true -forwarding-addresses add:${person.targetEmail} ` + 
      `-description 'Auto-maintained mail box for ${person.description}'`;
    output = await ExecUtils.execute(logger, command, {'PSA_PASSWORD' : person.password});
  } else if(person.type == config.tags.mailbox) {
    logger.info(`Trying to create a mailbox for ${person.firstName} ${person.lastName} (real mailbox)`);
    // Pass the password via environment variable (due to security reasons)
    command = `plesk bin mail --create ${person.emailAddress} -mailbox true -passwd '' -description 'Auto-maintained mail box for ${person.description}'`;
    output = await ExecUtils.execute(logger, command, {'PSA_PASSWORD' : person.password});
  } else {
    logger.error(`No implementation for type ${person.type} existing. Did the developer miss something?!`);
    return false;
  }
  if (!(output === undefined)) {
    logger.debug(`Command result: ${output.replace(/\r?\n/g, '')}`);
    output = output.trim();
    if (output.startsWith('SUCCESS')) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * Check if there is a governed mailbox for the given email address
 * @param {array} governedMailboxes Array of governed mailboxes
 * @param {string} emailAddress email address to check
 * @returns {Boolean} true if there is a governed mailbox for the given email address, otherwise false
 */
function isMailboxGoverned(governedMailboxes, emailAddress) {
  for (var i in governedMailboxes) {
    if (governedMailboxes[i].name == emailAddress) {
      return true;
    }
  }
  return false;
}

/**
 * Determine all governed mailboxes incl. their details
 * @return {array} - governed mailboxes
 */
async function getGovernedMailboxes() {
  logger.info(`Trying to all governed mailboxes...`);
  var mailboxes = await getMailboxes();

  var governedMailboxes = [];
  for (var i in mailboxes) {
    if (!(mailboxes[i].details === undefined) && !(mailboxes[i].details.description === undefined) && mailboxes[i].details.description.startsWith('Auto-maintained mail box')) {
      governedMailboxes.push(mailboxes[i]);
    }
  }
  return governedMailboxes;
}

/**
 * Determine all mailboxes incl. their details
 * @return {array} - mailboxes
 * [{"type":"mailname","name":"<mail>@<domain>"},
 *  {"type":"alias","name":"<mail>@<domain>"},
 * ...]
 */
async function getMailboxes() {
  logger.info(`Trying to list and get details of all mailboxes...`);
  var output = await ExecUtils.execute(logger, `plesk bin mail -l -json`);
  var mailboxes = JSON.parse(output);

  var v = new Validator();
  var mailboxesSchema = {
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "type": { "type": "string" },
        "name": { "type": "string" },
      },
      "required": ["type", "name"]
    }
  };
  var validatorResult = v.validate(mailboxes, mailboxesSchema);
  if (validatorResult.valid) {
    for (var i in mailboxes) {
      mailboxes[i].details = await getMailboxDetails(mailboxes[i].name);
    }
    return mailboxes;
  } else {
    logger.error(validatorResult.toString());
    return;
  }
}

/**
 * Determine mailbox details
 * @return {array} - mailbox details
 * 
 * Exemplary result of command 'plesk bin mail -i <mail>@<domain>':
 * Mailname:           test
 * Domain:             <domain>
 * Mailbox:            false
 * Password type:      sym
 * Mbox quota:         Default value (Unlimited)
 * Mailgroup:          true
 * Group member(s):    <mail>@<external domain> 
 * Attachment files:   Empty
 * Autoresponders:     Disabled
 * Description:        Auto-maintained mail box for ${person.description}
 * 
 * SUCCESS: Gathering information for '<mail>@<domain>' complete
 */
async function getMailboxDetails(emailAddress) {
  logger.info(`Trying to get mail box details for ${emailAddress}...`);

  var command = `plesk bin mail -i ${emailAddress}`;
  var output = await ExecUtils.execute(logger, command);
  output = output.split('\n');
  var details = {};
  var success = false;
  for (var i in output) {
    if (output[i].startsWith('Mailname')) {
      details.mailname = output[i].replace('Mailname:', '').trim();

    } else if (output[i].startsWith('Domain')) {
      details.domain = output[i].replace('Domain:', '').trim();

    } else if (output[i].startsWith('Mailbox')) {
      details.mailbox = output[i].replace('Mailbox:', '').trim();

    } else if (output[i].startsWith('Password type')) {
      details.passwordType = output[i].replace('Password type:', '').trim();

    } else if (output[i].startsWith('Mbox quota')) {
      details.mailboxQuota = output[i].replace('Mbox quota:', '').trim();

    } else if (output[i].startsWith('Mailgroup')) {
      details.mailgroup = output[i].replace('Mailgroup:', '').trim();

    } else if (output[i].startsWith('Group member(s)')) {
      details.groupMembers = output[i].replace('Group member(s):', '').trim();

    } else if (output[i].startsWith('Attachment files')) {
      details.attachmentFiles = output[i].replace('Attachment files:', '').trim();

    } else if (output[i].startsWith('Autoresponders')) {
      details.autoresponders = output[i].replace('Autoresponders:', '').trim();

    } else if (output[i].startsWith('Description')) {
      details.description = output[i].replace('Description:', '').trim();

    } else if (output[i].startsWith('SUCCESS')) {
      success = true;
    }
  }
  if (success) {
    return details;
  } else {
    return;
  }
}

module.exports = {
  readInputData: readInputData,
  getMailboxDetails: getMailboxDetails,
  getMailboxes: getMailboxes,
  getGovernedMailboxes: getGovernedMailboxes,
  createMailbox: createMailbox,
  removeMailbox: removeMailbox,
  isMailboxGoverned: isMailboxGoverned,
  main: main
};