const Message = require("#models/message.model");
const Request = require("#models/request.model");
const User = require("#models/user.model");
const { getResend } = require("#utils/resend");
const { chatMessageEmail } = require("#utils/email templates/chat-message");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — is this the first message sent in this request's chat TODAY?
   We count messages for this requestId created since UTC midnight.
   The new message is already saved before we call this, so count <= 1 = first.
───────────────────────────────────────────────────────────────────────────── */
const isFirstMessageToday = async (requestId) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const count = await Message.countDocuments({
    requestId,
    createdAt: { $gte: startOfDay },
  });

  return count <= 1;
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPER — send one notification email (fire-and-forget, never throws)
───────────────────────────────────────────────────────────────────────────── */
const sendChatNotificationEmail = async ({
  recipientEmail,
  recipientName,
  senderName,
  senderRole,
  siteName,
  siteUrl,
  messagePreview,
}) => {
  const resend = getResend();
  if (!resend || !process.env.RESEND_FROM_EMAIL) return;

  try {
    const html = chatMessageEmail({
      senderName,
      senderRole,
      recipientName,
      siteName,
      siteUrl,
      messagePreview: messagePreview.slice(0, 300),
    });

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: recipientEmail,
      subject: `New message from ${senderName} — ${siteName}`,
      html,
    });
  } catch (err) {
    console.error("[chat:email]", err.message);
  }
};

/**
 * @desc  Chat socket handler — attached per connected socket
 *        Rooms are keyed by requestId so only participants can see messages.
 */
module.exports = (io, socket) => {
  const userId = socket.user.id;
  const userRole = socket.user.role;

  /* ─────────────────────────────────────────────
     JOIN a request room
     Payload: { requestId }
  ───────────────────────────────────────────── */
  socket.on("chat:join", async ({ requestId }) => {
    try {
      const request = await Request.findById(requestId)
        .populate("userId", "_id")
        .populate("assignedTo", "_id");

      if (!request) {
        return socket.emit("chat:error", { message: "Request not found" });
      }

      // ✅ Only the client who owns the request, the assigned developer,
      //    or an admin/superadmin may join the room.
      const isOwner = request.userId?._id?.toString() === userId;
      const isDeveloper = request.assignedTo?._id?.toString() === userId;
      const isAdmin = userRole === "admin" || userRole === "superadmin";

      if (!isOwner && !isDeveloper && !isAdmin) {
        return socket.emit("chat:error", { message: "Unauthorized" });
      }

      socket.join(requestId);

      // Send message history so the joining user sees previous chat
      const history = await Message.find({ requestId })
        .populate("senderId", "firstname surname email role")
        .sort({ createdAt: 1 });

      socket.emit("chat:history", { requestId, messages: history });
    } catch (err) {
      console.error("[chat:join]", err);
      socket.emit("chat:error", { message: "Failed to join room" });
    }
  });

  /* ─────────────────────────────────────────────
     SEND a message
     Payload: { requestId, text }
  ───────────────────────────────────────────── */
  socket.on("chat:send", async ({ requestId, text }) => {
    try {
      if (!text?.trim()) {
        return socket.emit("chat:error", {
          message: "Message cannot be empty",
        });
      }

      const request = await Request.findById(requestId)
        .populate("userId", "_id")
        .populate("assignedTo", "_id");

      if (!request) {
        return socket.emit("chat:error", { message: "Request not found" });
      }

      const isOwner = request.userId?._id?.toString() === userId;
      const isDeveloper = request.assignedTo?._id?.toString() === userId;
      const isAdmin = userRole === "admin" || userRole === "superadmin";

      if (!isOwner && !isDeveloper && !isAdmin) {
        return socket.emit("chat:error", { message: "Unauthorized" });
      }

      const message = await Message.create({
        requestId,
        senderId: userId,
        text: text.trim(),
      });

      const populated = await Message.findById(message._id).populate(
        "senderId",
        "firstname surname email role",
      );

      // Broadcast to everyone in the room (including sender)
      io.to(requestId).emit("chat:message", populated);

      /* ── Email notification — only on the first message of today ── */
      // const firstToday = await isFirstMessageToday(requestId);
      // if (!firstToday) return;

      // Load sender + full request context for the email
      const [sender, fullRequest] = await Promise.all([
        User.findById(userId).select("firstname surname email role"),
        Request.findById(requestId)
          .populate("userId", "firstname surname email")
          .populate("assignedTo", "firstname surname email")
          .populate("siteId", "name url"),
      ]);

      if (!sender || !fullRequest) return;

      const senderName = `${sender.firstname} ${sender.surname}`.trim();
      const senderRole = sender.role;
      const siteName = fullRequest.siteId?.name ?? "Unknown Site";
      const siteUrl = fullRequest.siteId?.url ?? "";

      const recipients = []; // [{ email, name }]

      if (senderRole === "client") {
        // → notify assigned developer (if any)
        if (fullRequest.assignedTo) {
          const dev = fullRequest.assignedTo;
          recipients.push({
            email: dev.email,
            name: `${dev.firstname} ${dev.surname}`.trim(),
          });
        }
        // → notify admin via env
        if (process.env.ADMIN_EMAIL) {
          recipients.push({ email: process.env.ADMIN_EMAIL, name: "Admin" });
        }
      } else if (senderRole === "developer") {
        // → notify client
        if (fullRequest.userId) {
          const client = fullRequest.userId;
          recipients.push({
            email: client.email,
            name: `${client.firstname} ${client.surname}`.trim(),
          });
        }
        // → notify admin via env
        if (process.env.ADMIN_EMAIL) {
          recipients.push({ email: process.env.ADMIN_EMAIL, name: "Admin" });
        }
      } else {
        if (fullRequest.userId) {
          const client = fullRequest.userId;
          recipients.push({
            email: client.email,
            name: `${client.firstname} ${client.surname}`.trim(),
          });
        }

        if (fullRequest.assignedTo) {
          const dev = fullRequest.assignedTo;
          recipients.push({
            email: dev.email,
            name: `${dev.firstname} ${dev.surname}`.trim(),
          });
        }

        if (process.env.ADMIN_EMAIL) {
          recipients.push({
            email: process.env.ADMIN_EMAIL,
            name: "Admin",
          });
        }
      }

      // Fire all emails concurrently — failures are swallowed inside the helper
      await Promise.all(
        recipients.map(({ email, name }) =>
          sendChatNotificationEmail({
            recipientEmail: email,
            recipientName: name,
            senderName,
            senderRole,
            siteName,
            siteUrl,
            messagePreview: text.trim(),
          }),
        ),
      );
    } catch (err) {
      console.error("[chat:send]", err);
      socket.emit("chat:error", { message: "Failed to send message" });
    }
  });

  /* ─────────────────────────────────────────────
     LEAVE a request room
     Payload: { requestId }
  ───────────────────────────────────────────── */
  socket.on("chat:leave", ({ requestId }) => {
    socket.leave(requestId);
  });
};
