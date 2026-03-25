const jwt = require("jsonwebtoken");
const asyncHandler = require("#utils/async-handler");
const UserModel = require("#models/user.model");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Helpers
const generateAccessToken = (user) => {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
};

const generateRefreshToken = (user) => {
  return jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

// Common cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};


// Register
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    const error = new Error("User already exists.");
    error.status = 400;
    throw error;
  }

  const newUser = await UserModel.create({ username, email, password });

  const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email, username : newUser.username });
  const refreshToken = generateRefreshToken({ id: newUser.id, email: newUser.email, username : newUser.username });

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  return res.status(201).json({
    success: true,
    message: "User registered successfully.",
    data: { id: newUser.id, username: newUser.username, email: newUser.email },
  });
});


// Login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) {
    const error = new Error("Invalid credentials.");
    error.status = 400;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid credentials.");
    error.status = 400;
    throw error;
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email, username: user.username });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email, username: user.username });

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    data: { id: user.id, username: user.username, email: user.email },
  });
});

// Refresh Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    const error = new Error("Refresh token is required.");
    error.status = 403;
    throw error;
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const accessToken = generateAccessToken({ id: decoded.id, email: decoded.email, username: decoded.username });

    res.cookie("accessToken", accessToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      data: { id: decoded.id, email: decoded.email },
    });
  } catch (err) {
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("accessToken", cookieOptions);
    const error = new Error("Invalid or expired refresh token.");
    error.status = 403;
    throw error;
  }
});


// verify me 
const verifyMe = asyncHandler((req, res) => {
  res.json({
    data: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
    },
  });
});


// Logout
const logout = asyncHandler(async (req, res) => {

  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  verifyMe
};
