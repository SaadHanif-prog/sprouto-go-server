module.exports.adminPaymentSuccessEmail = function ({ firstname, surname, email, plan, isAddon, expiresAt }) {
  const name = `${firstname} ${surname}`;
  const label = isAddon ? "Add-on" : "Plan";
  const planDisplay = plan
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : "Unknown";
  const expiryDisplay = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "N/A";

  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        New Payment Received 💳
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        A client has just activated a ${label.toLowerCase()} on Sprouto Go. Here are the details:
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          Payment Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Client:</b> ${name}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Email:</b> ${email}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>${label}:</b> ${planDisplay}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Active Until:</b> ${expiryDisplay}
        </p>

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          You can review this client's subscription from your admin panel.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};

module.exports.clientPaymentSuccessEmail = function ({ firstname, surname, plan, isAddon, expiresAt }) {
  const name = `${firstname} ${surname}`;
  const label = isAddon ? "Add-on" : "Plan";
  const planDisplay = plan
    ? plan.charAt(0).toUpperCase() + plan.slice(1)
    : "Your subscription";
  const expiryDisplay = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "N/A";

  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        Payment Confirmed ✅
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${name}, your payment was successful and your ${label.toLowerCase()} is now active.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          ${label} Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>${label}:</b> ${planDisplay}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Active Until:</b> ${expiryDisplay}
        </p>

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          Your access has been updated automatically. You can view your subscription details in your dashboard.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};


