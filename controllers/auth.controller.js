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
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

// ================= REGISTER =================
const register = asyncHandler(async (req, res) => {
  const {
    title,
    firstname,
    surname,
    email,
    password,
    company,
    address,
    subscription,
  } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    const error = new Error("User already exists.");
    error.status = 400;
    throw error;
  }

  const newUser = await UserModel.create({
    title,
    firstname,
    surname,
    email,
    password,
    company,
    address,
    subscription,
  });

  const payload = {
    id: newUser.id,
    email: newUser.email,
    firstname: newUser.firstname,
    surname: newUser.surname,
    role: newUser.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

 return res.status(201).json({
  success: true,
  message: "User registered successfully.",
  data: {
    id: newUser._id,

    firstname: newUser.firstname,
    surname: newUser.surname,

    email: newUser.email,
    role: newUser.role,

    company: {
      name: newUser.company?.name,
      number: newUser.company?.number,
    },

    address: {
      line1: newUser.address?.line1,
      city: newUser.address?.city,
      county: newUser.address?.county,
      postcode: newUser.address?.postcode,
    },
  },
});
});

// ================= LOGIN =================
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

  const payload = {
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    surname: user.surname,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.cookie("refreshToken", refreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  return res.status(200).json({
  success: true,
  message: "Login successful.",
  data: {
    id: user._id, 

    firstname: user.firstname,
    surname: user.surname,

    email: user.email,
    role: user.role,

    company: {
      name: user.company?.name,
      number: user.company?.number,
    },

    address: {
      line1: user.address?.line1,
      city: user.address?.city,
      county: user.address?.county,
      postcode: user.address?.postcode,
    },
  },
});
});

// ================= REFRESH TOKEN =================
const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    const error = new Error("Refresh token is required.");
    error.status = 403;
    throw error;
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const payload = {
      id: decoded.id,
      email: decoded.email,
      firstname: decoded.firstname,
      surname: decoded.surname,
      role: decoded.role,
    };

    const accessToken = generateAccessToken(payload);

    res.cookie("accessToken", accessToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
      data: payload,
    });
  } catch (err) {
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("accessToken", cookieOptions);

    const error = new Error("Invalid or expired refresh token.");
    error.status = 403;
    throw error;
  }
});

// ================= VERIFY ME =================
const verifyMe = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const user = await UserModel.findById(userId).lean();

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    data: {
      id: user._id,

      firstname: user.firstname,
      surname: user.surname,

      email: user.email,
      role: user.role,

      company: {
        name: user.company?.name,
        number: user.company?.number,
      },

      address: {
        line1: user.address?.line1,
        city: user.address?.city,
        county: user.address?.county,
        postcode: user.address?.postcode,
      },
    },
  });
});

// ================= LOGOUT =================
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

// ================= GET ALL USERS =================
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UserModel.find().select("-password"); 

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});


module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  verifyMe,
  getAllUsers
};