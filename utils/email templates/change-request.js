module.exports.clientChangeRequestEmail = function ({
  username,
  siteName,
  requestDetails,
}) {
  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        New Change Request 🛠️
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi, ${username} has submitted a new change request for their site.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">
        
        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          Request Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Site:</b> ${siteName}
        </p>

        <p style="margin:10px 0;color:#e2e8f0;font-size:14px;line-height:20px;">
          ${requestDetails}
        </p>

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          Please review this request from your admin panel.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};