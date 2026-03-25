const asyncHandler = require('#utils/asyncHandler');
const { getResend } = require('#services/resend');

const sendEmail = asyncHandler(async (req, res) => {
  const { to, subject, html } = req.body;
  const resend = getResend();

  if (!resend) {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return res.json({ success: true, simulated: true });
  }

  const data = await resend.emails.send({
    from: 'SproutoGO <onboarding@resend.dev>',
    to,
    subject,
    html,
  });

  res.json({ success: true, data });
});

module.exports = { sendEmail };