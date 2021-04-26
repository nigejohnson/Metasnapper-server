
import express from 'express';

// import { json, text as _text } from 'body-parser';
import bodyparserpkg from 'body-parser';

import multer from 'multer';
// const https = require('https');
// const fs = require('fs');
// import { createTransport } from 'nodemailer';
import nodemailer from 'nodemailer';
// import { model, Promise, connect } from 'mongoose';
// import { model, connect } from 'mongoose';

const { json, text: _text } = bodyparserpkg;
const app = express();
const sendEmail = true;

const mailuser = process.env.MAILUSER;
const mailfrompwd = process.env.MAILFROMPWD;
const mailfrom = process.env.MAILFROM;

var defaultmailto = process.env.MAILTO; // Setting the default mailto address
var mailto;

// Yahoo or yahoo should work as the service name for yahoo
const transporter = nodemailer.createTransport({
  service: 'SendGrid', // was gmail , but kept blocking
  auth: {
    user: mailuser,
    pass: mailfrompwd
  }
});

function sendAnEmail (item) {
  console.log('Mail to is: ' + mailto);
  // The next line assumes that the datetime is in the defult javascript format of
  // 2021-04-17T14:50:29.046Z, and splits the date from the time to use in the file name
  // var datetimearray = item.datetime.split('T');
  // var dateonly = datetimearray[0];
  // Putting datetime first in the file name so that snaps order sensibly
  var rawattachname = item.datetime + '-title-' + item.title;
  // Clean any invalid characters out of the filename
  // var attachname = rawattachname.replace(/[<>:"/\\|?*]/g, '');
  // The following is the full verion of the regex to exclude invalid characters
  // from windows file names including control characters, the line feeds.
  // But this causes semistandard to object and I don't think you can enter these characters via the
  // app.
  // var attachname = rawattachname.replace(/[<>:"\/\\\|?*\x00-\x1F]/g, '');
  // Also removing any leading or trailing whitespace.
  var attachname = rawattachname.replace(/[<>:"/\\|?*]/g, '').trim() + '.jpeg';

  console.log('Attachment name is: ' + attachname);
  var mailOptions = {
    from: mailfrom,
    to: mailto,
    subject: item.title,
    // subject: item.title,
    text: item.note + '\n' + 'At time: ' + item.datetime + '\n' + 'At location: ' + item.latitude + ' latitude and ' + item.longitude + ' longitude.',
    // text: 'Field Notes test message'
    attachments: [
      {
        filename: attachname,
        // encoded image as an attachment
        path: item.photoasdataurl

      }
    ]

  };

  // Remove the attachments if the photo is empty/absent
  if (item.photoasdataurl === '') {
    delete mailOptions.attachments;
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      handleEmailingError(item, error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function handleEmailingError (item, error) {
  // As nodemailer is inherently asynchronous we need an asynchronous way to alert any errors
  // For now emailing, which is imperfect if the error is actually at our smtp service!
  console.log('Attempting to send the emailing error and email content to: ' + defaultmailto);
  var mailOptions = {
    from: mailfrom,
    to: defaultmailto,
    subject: 'ERROR sending MetaSnap: ' + item.title + ' to email address ' + mailto,
    // subject: item.title,
    text: 'The following error ' + error + ' occurred when sending the followng snap from ' + mailfrom + ' to ' + mailto + ':\n' + item.note + '\n' + 'At time: ' + item.datetime + '\n' + 'At location: ' + item.latitude + ' latitude and ' + item.longitude + ' longitude.',
    // text: 'Field Notes test message'
    attachments: [
      { // encoded image as an attachment
        path: item.photoasdataurl

      }
    ]

  };

  // Remove the attachments if the photo is empty/absent
  if (item.photoasdataurl === '') {
    delete mailOptions.attachments;
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      console.log('Unable to forward on the error and the failing email. The problem may be with the SMTP service. Giving up.');
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}
const port = process.env.PORT || 5000;

app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/plain');
  // enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'X-CUSTOM, Content-Type, configured-mailto');
  next();
});

const upload = multer();
const formParser = upload.fields([]);
const jsonParser = json({ limit: '500mb' });
const textParser = _text({ limit: '500mb' });

// This serves static files from the specified directory
// app.use(express.static(__dirname));
// app.use(bodyParser.json({limit: '500mb'}));
// app.use(bodyParser.urlencoded({limit: '500mb', extended: true}));

app.post('/', [formParser, jsonParser, textParser], (req, res) => {
  // res.write('Snaps received successfully. ');
  // res.write starts responding to the client straight-away... from there-on you can't reset the
  // response status to indicate an error!

  try {
    console.log('Received snaps as follows:');
    console.log('\n\n');

    console.log(JSON.stringify(req.headers, null, 2));
    console.log('\n\n');

    const contentType = req.get('content-type');

    mailto = req.headers['configured-mailto'];

    if (mailto === undefined) {
      res.status(400).send('No configured-mailto header on request.');
    }

    var payload = JSON.parse(req.body);

    if (payload === undefined) {
      res.status(400).send('No JSON payload on request.');
    }

    console.log(req.body);

    console.log('Content type is ' + contentType);
    console.log('Finished receiving posted snaps.');
    console.log('\n\n');

    if (sendEmail) {
      payload.forEach(sendAnEmail);
    }

    var reformattedMailTo = mailto.replace(/;/g, '<br>');

    res.write('Snaps being posted to:<br>' + reformattedMailTo);

    res.end();
  } catch (e) {
    res.status(500).send('Unexpected server side error: ' + e);
  }
});

const server = app.listen(port, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});
