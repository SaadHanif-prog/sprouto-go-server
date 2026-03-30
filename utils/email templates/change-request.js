module.exports.clientChangeRequestEmail = function ({
  username,
  siteName,
  requestDetails,
}) {
  return `
  <div style="background:#F6FFF3;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#C4EABC;border-radius:18px;padding:28px;">

      <h2 style="margin:0;color:#01211C;">New Change Request 🛠️</h2>

      <p style="color:#01211C;margin-top:18px;font-size:15px;line-height:22px;">
        ${username} has submitted a new change request for their site.
      </p>

      <div style="background:#ffffff;border-radius:14px;padding:18px;margin-top:18px;">
        <h3 style="margin:0 0 10px 0;color:#01211C;font-size:16px;">
          Request Details
        </h3>

        <p style="margin:6px 0;color:#01211C;font-size:14px;">
          <b>Site:</b> ${siteName}
        </p>

        <p style="margin:10px 0;color:#01211C;font-size:14px;line-height:20px;">
          ${requestDetails}
        </p>
      </div>

      <p style="margin-top:18px;color:#01211C;font-size:14px;">
        Please review and take action from your admin panel.
      </p>

      <p style="margin-top:22px;color:#779471;font-size:12px;text-align:center;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
  `;
};