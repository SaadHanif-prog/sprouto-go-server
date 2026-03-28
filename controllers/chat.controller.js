const Message = require("#models/message.model");
const Request = require("#models/request.model");

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
        return socket.emit("chat:error", { message: "Message cannot be empty" });
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
        "firstname surname email role"
      );

      // Broadcast to everyone in the room (including sender)
      io.to(requestId).emit("chat:message", populated);
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