module.exports.clientWelcomeEmail = function ({ firstname, surname, email, company }) {
  const name = `${firstname} ${surname}`;
  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        Welcome to Sprouto Go 🚀
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        Hi ${name}, great to have you on board! Your account has been created and you're all set to get started.
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          Your Account Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Name:</b> ${name}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Email:</b> ${email}
        </p>

        ${company?.name ? `
        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Company:</b> ${company.name}
        </p>` : ""}

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          You can log in to your dashboard at any time to manage your sites, change requests, and subscriptions.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};


module.exports.adminNewUserEmail = function ({ firstname, surname, email, company, address }) {
  const name = `${firstname} ${surname}`;
  return `
  <div style="background:#050505;padding:40px;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border-radius:24px;padding:28px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(0,0,0,0.6);">

      <h2 style="margin:0;color:#ffffff;font-size:22px;">
        New Client Registered 🧑‍💼
      </h2>

      <p style="color:#94a3b8;margin-top:18px;font-size:15px;line-height:22px;">
        A new client has just signed up on Sprouto Go. Here are their details:
      </p>

      <div style="background:rgba(255,255,255,0.03);border-radius:16px;padding:18px;margin-top:18px;border:1px solid rgba(255,255,255,0.06);">

        <h3 style="margin:0 0 10px 0;color:#e2e8f0;font-size:16px;">
          Client Details
        </h3>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Name:</b> ${name}
        </p>

        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Email:</b> ${email}
        </p>

        ${company?.name ? `
        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Company:</b> ${company.name}
          ${company.number ? `(${company.number})` : ""}
        </p>` : ""}

        ${address?.line1 ? `
        <p style="margin:6px 0;color:#cbd5f5;font-size:14px;">
          <b>Address:</b> ${address.line1}, ${address.city || ""} ${address.postcode || ""}
        </p>` : ""}

        <p style="margin-top:14px;color:#64748b;font-size:12px;line-height:18px;">
          Review this new account from your admin panel.
        </p>
      </div>

      <p style="margin-top:22px;color:#475569;font-size:12px;text-align:center;">
        © 2026 Sprouto Go. All rights reserved.
      </p>
    </div>
  </div>
  `;
};

