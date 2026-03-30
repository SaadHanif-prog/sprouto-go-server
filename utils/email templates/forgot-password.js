module.exports.forgotPasswordEmail = function ({ username, resetLink }) {
  return `
  <div style="background:#F6FFF3;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#C4EABC;border-radius:18px;padding:28px;">

      <h2 style="margin:0;color:#01211C;">Reset Your Password 🔐</h2>

      <p style="color:#01211C;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${username}, we received a request to reset your password.
      </p>

      <div style="background:#ffffff;border-radius:14px;padding:18px;margin-top:18px;">
        <p style="margin:0;color:#01211C;font-size:14px;">
          Click the button below to set a new password.
        </p>

        <a href="${resetLink}"
          style="display:inline-block;margin-top:16px;background:#01211C;color:#ffffff;
                 padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>

        <p style="margin-top:14px;color:#788582;font-size:12px;line-height:18px;">
          If you didn’t request this, you can safely ignore this email.
        </p>
      </div>

      <p style="margin-top:22px;color:#779471;font-size:12px;text-align:center;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
  `;
};