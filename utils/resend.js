const { Resend } = require('resend');

let resendClient = null;

function getResend() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn('RESEND_API_KEY is missing. Email sending will be simulated.');
      return null;
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

module.exports = { getResend };