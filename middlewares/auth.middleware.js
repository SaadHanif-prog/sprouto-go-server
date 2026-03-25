const jwt = require("jsonwebtoken");
const asyncHandler = require("#utils/async-handler");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    const error = new Error("Access token missing.");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };

    next();
  } catch (err) {
    const error = new Error("Invalid or expired access token.");
    error.status = 401;
    throw error;
  }
});

module.exports = authMiddleware;
