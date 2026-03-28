const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatHandler = require("./chat.controller");

/**
 * Call once in your app entry after app.listen():
 *
 *   const httpServer = app.listen(PORT);
 *   initSocket(httpServer);
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /* ── JWT auth middleware ─────────────────────────────────────────── */
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication error: no token"));
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      // Normalise to a single shape regardless of what your JWT contains.
      // Your authSlice uses `userId`; Mongoose _id is typically stored as `id`
      // in the token — support both so nothing breaks.
      socket.user = {
        id: decoded.id || decoded.userId || decoded._id,
        role: decoded.role,
      };

      next();
    } catch {
      next(new Error("Authentication error: invalid token"));
    }
  });

  /* ── Per-connection handler ──────────────────────────────────────── */
  io.on("connection", (socket) => {
    console.log(
      `[socket] connected  userId=${socket.user.id}  role=${socket.user.role}  sock=${socket.id}`
    );

    chatHandler(io, socket);

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected  sock=${socket.id}`);
    });
  });

  return io;
}

module.exports = initSocket;