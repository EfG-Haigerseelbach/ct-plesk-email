const EmailNotifier = require('./emailNotifier.js');
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

if(process.argv.length == 2 || 
    process.argv[2] == '--help' || process.argv[2] == '-help' || process.argv[2] == '--h' || process.argv[2] == '-h' || 
    process.argv.length > 4) {
    console.log(`Usage: node emailNotificationConfigurationTest.js recipient@example.org`);
    return;
} 

var recipientsEmailAddresses = process.argv[2];
var subject = "E-mail Notification Configuration Test ✔";
var text = "This is a test e-mail to check whether the configuration is fine.";
var html = "This is a test e-mail to check whether the configuration is fine.";

EmailNotifier.send(logger, recipientsEmailAddresses, subject, text, html).catch(console.error);