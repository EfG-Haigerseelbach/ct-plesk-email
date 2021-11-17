const nodemailer = require("nodemailer");
var config = require('config');

async function send(recipientsEmailAddresses, subject, text, html) {
    
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
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  }   

module.exports = {
    send: send
};