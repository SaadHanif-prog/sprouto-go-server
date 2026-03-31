module.exports.forgotPasswordEmail = function ({ username, resetLink }) {
  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        Reset Your Password 🔐
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${username}, we received a request to reset your password.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">
        <p style="margin:0;color:#e2e8f0;font-size:14px;">
          Click the button below to set a new password.
        </p>

        <a href="${resetLink}"
          style="display:inline-block;margin-top:16px;background:#10b981;color:#050505;
                 padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:600;
                 box-shadow:0 0 15px rgba(16,185,129,0.4);">
          Reset Password
        </a>

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          If you didn’t request this, you can safely ignore this email.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
  `;
};