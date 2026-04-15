const cron = require("node-cron");
const Request = require("#models/request.model");
const { getResend } = require("#utils/resend");
const { developerDelayReminderEmail } = require("#utils/email templates/request-delay-reminder");

const DELAY_THRESHOLDS = {
  high:   1,
  medium: 2,
  low:    4,
};

const checkDelayedRequests = async () => {
  const resend = getResend();

  if (!resend || !process.env.RESEND_FROM_EMAIL) return;

  const now   = Date.now();
  const today = new Date().toDateString();

  const activeRequests = await Request.find({
    status:     { $ne: "completed" },
    assignedTo: { $ne: null },
  })
    .populate("assignedTo", "firstname surname email")
    .populate("siteId", "name url");

  for (const request of activeRequests) {
    const developer = request.assignedTo;
    if (!developer?.email) continue;

    const ageDays = (now - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const threshold = DELAY_THRESHOLDS[request.priority];

    if (ageDays < threshold) continue;

    // ✅ Fix 2: skip if already reminded today (this check was here but the early-return was missing)
    if (request.lastRemindedAt?.toDateString() === today) continue;

    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL,
        to:      developer.email,
        subject: `⚠️ Delayed Request: ${request.title} [${request.priority.toUpperCase()}]`,
        html:    developerDelayReminderEmail({
          developerName: developer.firstname || "Developer",
          requestTitle:  request.title,
          priority:      request.priority,
          daysOld:       Math.floor(ageDays),
          siteUrl:       request.siteId?.url  || null,
          siteName:      request.siteId?.name || null,
        }),
      });

      // ✅ Fix 3: only mark as reminded AFTER successful send, not before
      await Request.findByIdAndUpdate(request._id, { lastRemindedAt: new Date() });

      console.log(`[DelayChecker] Reminder sent → ${developer.email} | "${request.title}"`);
    } catch (err) {
      console.error(`[DelayChecker] Email failed for request ${request._id}:`, err.message);
    }
  }
};

exports.startDelayCheckerCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("[DelayChecker] Running delayed-request check...");
    try {
      await checkDelayedRequests();
    } catch (err) {
      console.error("[DelayChecker] Cron error:", err.message);
    }
  });

  console.log("[DelayChecker] Cron job scheduled (daily at 09:00).");
};