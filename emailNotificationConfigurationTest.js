const EmailNotifier = require('./emailNotifier.js');

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

EmailNotifier.send(recipientsEmailAddresses, subject, text, html).catch(console.error);