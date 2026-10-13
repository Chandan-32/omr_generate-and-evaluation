const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../../data/notifications_log.txt');

function logNotification(type, to, subject, content) {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toLocaleString();
  const border = '='.repeat(60);
  const logMessage = `
${border}
[${timestamp}] - TYPE: ${type.toUpperCase()}
TO: ${to}
SUBJECT/TITLE: ${subject}
CONTENT:
${content}
${border}
`;

  console.log(`✉️ [Simulated Notification] Sent ${type} to ${to}`);
  fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
}

const notifier = {
  sendEmail: async (email, subject, text, html = '') => {
    // If Nodemailer SMTP is configured, we could try to send it here.
    // For now, we simulate and log it.
    logNotification('email', email, subject, text || html);
    return true;
  },

  sendSMS: async (phone, message) => {
    // If Twilio is configured, we could send it.
    // For now, we simulate and log it.
    logNotification('sms', phone, 'Booking SMS Update', message);
    return true;
  }
};

module.exports = notifier;
