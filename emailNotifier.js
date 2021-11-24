const nodemailer = require("nodemailer");
var config = require('config');
const { loggers } = require("winston");

async function send(logger, recipientsEmailAddresses, subject, text, html) {
    // create a reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure, // true for 465, false for other ports
      auth: {
        user: config.email.user, 
        pass: config.email.password,
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: config.email.sender, // sender address
      to: recipientsEmailAddresses, // list of receivers
      subject: subject,
      text: text, // plain text body
      html: html // html body
    }).catch((err) => {  
      logger.error(err);
    });
    if(info != undefined) {
      logger.info(info.messageId);
      return true;
    } else {
      return false;
    }
  }   

module.exports = {
    send: send
};