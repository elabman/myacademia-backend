/**
 * Checks the email settings in .env.
 *
 *   npm run mail:test                      connect and log in only (nothing is sent)
 *   npm run mail:test -- you@example.com   also send a short test message to that address
 *
 * It prints the mail server's answer plus a hint for the usual mistakes. The password is never printed.
 */
require('dotenv').config();
const config = require('../config/config');
const { missingMailSettings, sendMail, verifyMail } = require('../services/mailService');

function hint(error) {
  const text = `${error.code || ''} ${error.responseCode || ''} ${error.message || ''}`;

  if (/Application-specific password|5\.7\.9|InvalidSecondFactor/i.test(text)) {
    return 'Gmail wants an APP PASSWORD here, not the normal account password. Turn on 2-Step Verification, create an app password at https://myaccount.google.com/apppasswords and put its 16 characters (no spaces) in SMTP_PASS.';
  }
  if (/535|EAUTH|Username and Password not accepted|BadCredentials/i.test(text)) {
    return 'The mail server refused the login. Check that SMTP_USER is the full address and that SMTP_PASS is correct. For Gmail it must be a 16-character app password (a normal password is refused).';
  }
  if (/wrong version number|ssl3_get_record|SSL routines/i.test(text)) {
    return 'The port and SMTP_SECURE do not match. Use port 465 with SMTP_SECURE=true, or port 587 with SMTP_SECURE=false.';
  }
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|ESOCKET|ECONNECTION|EAI_AGAIN/i.test(text)) {
    return 'Could not reach the mail server. Check SMTP_HOST and the port, and that this computer/server is allowed to connect out on that port (some hosts block 465/587).';
  }
  if (/553|550|5\.7\.1|sender/i.test(text)) {
    return 'The server did not accept the sender address. MAIL_FROM must be the same address you log in with (Gmail replaces any other sender).';
  }
  return null;
}

async function run() {
  const recipient = process.argv[2];
  const { host, port, secure, user, from } = config.mail;

  const missing = missingMailSettings();
  if (missing.length) {
    console.error(`Email is not configured yet. Fill these in .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Server: ${host}:${port} (${secure ? 'SSL/TLS' : 'STARTTLS'})  Login: ${user}  From: ${from}`);
  if ((host.toLowerCase().includes('gmail') && config.mail.pass.replace(/\s/g, '').length !== 16)) {
    console.log(`Note: the password has ${config.mail.pass.replace(/\s/g, '').length} characters; a Gmail app password has 16.`);
  }

  console.log('1) Connecting and logging in...');
  await verifyMail();
  console.log('   OK: the mail server accepted the login.');

  if (!recipient) {
    console.log('2) No recipient given, so nothing was sent. To send a test message run:\n   npm run mail:test -- you@example.com');
    return;
  }

  console.log(`2) Sending a test message to ${recipient}...`);
  const result = await sendMail({
    to: recipient,
    subject: 'MyAcademia test email',
    text: 'This is a test message from the MyAcademia backend. If you can read it, email sending works.',
  });
  console.log(`   OK: accepted by the server (${(result.accepted || []).join(', ') || 'no recipients'}).`);
  if (result.rejected && result.rejected.length) console.log(`   Rejected: ${result.rejected.join(', ')}`);
  console.log('Now check the inbox (and the spam folder) of that address.');
}

run().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  const tip = hint(error);
  if (tip) console.error(`Hint: ${tip}`);
  process.exit(1);
});
