const { query } = require('../config/database');
const { sendMail } = require('./mailService');

async function getSettings() {
  const [settings] = await query(
    'SELECT recipient_email, enabled FROM review_notification_settings WHERE id = 1'
  );

  return {
    recipient_email: settings?.recipient_email ?? '',
    enabled: Boolean(settings?.enabled),
  };
}

async function saveSettings({ recipient_email, enabled }) {
  await query(
    `INSERT INTO review_notification_settings (id, recipient_email, enabled)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE recipient_email = ?, enabled = ?`,
    [recipient_email, enabled, recipient_email, enabled]
  );

  return { recipient_email, enabled };
}

async function notifyReview({ reviewId, staffName, serviceName, rating }) {
  const settings = await getSettings();
  if (!settings.enabled) return;

  await sendMail({
    to: { address: settings.recipient_email, name: '' },
    subject: 'New MyAcademia service review',
    text: [
      'A new service review was submitted in MyAcademia.',
      '',
      `Review ID: ${reviewId}`,
      `Staff member: ${staffName}`,
      `Service: ${serviceName}`,
      `Rating: ${rating}/5`,
      '',
      'Open Admin → Reviews in MyAcademia to read the full review.',
    ].join('\n'),
  });
}

module.exports = { getSettings, saveSettings, notifyReview };
