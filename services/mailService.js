const nodemailer = require('nodemailer');
const config = require('../config/config');

let transporter;

/** Names of the settings that are still empty (never their values). */
function missingMailSettings() {
  const { host, user, pass, from } = config.mail;
  return [
    ['SMTP_HOST', host],
    ['SMTP_USER', user],
    ['SMTP_PASS', pass],
    ['MAIL_FROM', from],
  ].filter(([, value]) => !value).map(([name]) => name);
}

const isMailConfigured = () => missingMailSettings().length === 0;

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return transporter;
}

/** Connects and logs in without sending anything. Throws the mail server's own error. */
async function verifyMail() {
  const mailer = getTransporter();
  if (!mailer) throw new Error(`Email is not configured. Missing: ${missingMailSettings().join(', ')}`);
  await mailer.verify();
}

/** Sends one message. Throws on failure, so callers decide whether a failed email matters. */
async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) throw new Error(`Email is not configured. Missing: ${missingMailSettings().join(', ')}`);
  return mailer.sendMail({ from: config.mail.from, to, subject, text, html });
}

module.exports = { isMailConfigured, missingMailSettings, sendMail, verifyMail };
