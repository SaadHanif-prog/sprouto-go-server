/**
 * Email sent to recipient(s) when a new chat message arrives.
 *
 * @param {object} opts
 * @param {string} opts.senderName      - Display name of the person who sent the message
 * @param {string} opts.senderRole      - "client" | "developer" | "admin"
 * @param {string} opts.recipientName   - Display name of the person receiving this email
 * @param {string} opts.siteName        - Name of the site this chat belongs to
 * @param {string} opts.siteUrl         - URL of the site
 * @param {string} opts.messagePreview  - First ~200 chars of the message body
 * @param {string} opts.panelUrl        - Deep-link into the admin / dev / client panel
 */
module.exports.chatMessageEmail = function ({
  senderName,
  senderRole,
  recipientName,
  siteName,
  siteUrl,
  messagePreview,
  panelUrl,
}) {
  const roleLabel =
    senderRole === "client"
      ? "Client"
      : senderRole === "developer"
        ? "Developer"
        : "Admin";

  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        New Message 💬
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${recipientName}, you have received a new message from
        <b style="color:#e2e8f0;">${senderName}</b> (${roleLabel}).
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          Message Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Site:</b> ${siteName}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>URL:</b> <a href="${siteUrl}" target="_blank" style="color:#6366f1;">${siteUrl}</a>
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>From:</b> ${senderName} (${roleLabel})
        </p>

        <div style="background:rgba(255,255,255,0.05);border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:12px 14px;margin-top:14px;">
          <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:20px;">
            ${messagePreview}
          </p>
        </div>

        ${
          panelUrl
            ? `
        <div style="text-align:center;margin-top:20px;">
          <a href="${panelUrl}" target="_blank"
            style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;">
            View Conversation →
          </a>
        </div>`
            : ""
        }

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          Please log in to your panel to reply.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};