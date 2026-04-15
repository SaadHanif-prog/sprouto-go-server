const priorityColor = {
  high:   "#f87171",
  medium: "#818cf8",
  low:    "#94a3b8",
};

module.exports.developerDelayReminderEmail = function ({
  developerName,
  requestTitle,
  priority,
  daysOld,
  siteUrl,
  siteName,
}) {
  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        Request Reminder ⏰
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi <strong style="color:#e2e8f0;">${developerName}</strong>, a request assigned to you
        has been waiting for <strong style="color:#f87171;">${daysOld} day${daysOld !== 1 ? "s" : ""}</strong>
        and still needs attention.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 14px 0;color:#e2e8f0;font-size:16px;">
          Request Details
        </h3>

        <p style="margin:6px 0;color:#cbd5e1;font-size:14px;">
          <b>Title:</b> ${requestTitle}
        </p>

        <p style="margin:6px 0;color:#cbd5e1;font-size:14px;">
          <b>Priority:</b>
          <span style="color:${priorityColor[priority] ?? "#94a3b8"};font-weight:600;text-transform:uppercase;">
            ${priority}
          </span>
        </p>

        <p style="margin:6px 0;color:#cbd5e1;font-size:14px;">
          <b>Age:</b> ${daysOld} day${daysOld !== 1 ? "s" : ""} old
        </p>

        ${siteName ? `
        <p style="margin:6px 0;color:#cbd5e1;font-size:14px;">
          <b>Site:</b>
          ${siteUrl
            ? `<a href="${siteUrl}" style="color:#34d399;text-decoration:none;">${siteName}</a>`
            : siteName
          }
        </p>` : ""}

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          Please log in to your dashboard and update the status of this request as soon as possible.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};