module.exports.newSiteCreatedEmail = function ({ username, siteName, dashboardLink }) {
  return `
  <div style="background:#F6FFF3;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#C4EABC;border-radius:18px;padding:28px;">

      <h2 style="margin:0;color:#01211C;">New Site Created 🚀</h2>

      <p style="color:#01211C;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${username}, your new site has been successfully added to your dashboard.
      </p>

      <div style="background:#ffffff;border-radius:14px;padding:18px;margin-top:18px;">
        <h3 style="margin:0 0 10px 0;color:#01211C;font-size:16px;">
          Site Details
        </h3>

        <p style="margin:6px 0;color:#01211C;font-size:14px;">
          <b>Site Name:</b> ${siteName}
        </p>

        <p style="margin-top:14px;color:#788582;font-size:12px;">
          You can now manage, upgrade, and customize this site from your dashboard.
        </p>
      </div>

      <a href="${dashboardLink}"
        style="display:inline-block;margin-top:20px;background:#01211C;color:#ffffff;
               padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:600;">
        Go to Dashboard
      </a>

      <p style="margin-top:22px;color:#779471;font-size:12px;text-align:center;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
  `;
};