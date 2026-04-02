const jwt = require("jsonwebtoken");
const asyncHandler = require("#utils/async-handler");
const UserModel = require("#models/user.model");
const crypto = require("crypto");
const { clientWelcomeEmail, adminNewUserEmail } = require("#utils/email templates/signup");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const {
  forgotPasswordEmail,
} = require("#utils/email templates/forgot-password");
const { getResend } = require("#utils/resend");


// Helpers
const generateAccessToken = (user) => {
  return jwt.sign(user, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
};

const generateRefreshToken = (user) => {
  return jwt.sign(user, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

// Common cookie options
const cookieOptions = {
  httpOnly: process.env.NODE_ENV === "production",
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

// ================= REGISTER =================
// const register = asyncHandler(async (req, res) => {
//   const {
//     title,
//     firstname,
//     surname,
//     email,
//     password,
//     company,
//     address,
//     subscription,
//   } = req.body;

//   const existingUser = await UserModel.findOne({ email });
//   if (existingUser) {
//     const error = new Error("User already exists.");
//     error.status = 400;
//     throw error;
//   }

//   const newUser = await UserModel.create({
//     title,
//     firstname,
//     surname,
//     email,
//     password,
//     company,
//     address,
//     subscription,
//   });

//   const payload = {
//     id: newUser.id,
//     email: newUser.email,
//     firstname: newUser.firstname,
//     surname: newUser.surname,
//     role: newUser.role,
//   };

//   const accessToken = generateAccessToken(payload);
//   const refreshToken = generateRefreshToken(payload);

//   res.cookie("refreshToken", refreshToken, cookieOptions);
//   res.cookie("accessToken", accessToken, cookieOptions);

//   return res.status(201).json({
//     success: true,
//     message: "User registered successfully.",
//     data: {
//       id: newUser._id,

//       firstname: newUser.firstname,
//       surname: newUser.surname,

//       email: newUser.email,
//       role: newUser.role,

//       company: {
//         name: newUser.company?.name,
//         number: newUser.company?.number,
//       },

//       address: {
//         line1: newUser.address?.line1,
//         city: newUser.address?.city,
//         county: newUser.address?.county,
//         postcode: newUser.address?.postcode,
//       },
//     },
//   });
// });

// Add these imports at the top of your auth controller alongside existing imports:
//
//   const { getResend } = require("../utils/resend");
//   const { clientWelcomeEmail } = require("../emails/clientWelcomeEmail");
//   const { adminNewUserEmail }   = require("../emails/adminNewUserEmail");

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

  // ─── Emails ───────────────────────────────────────────────────────────────
  const resend = getResend();

  if (resend && process.env.RESEND_FROM_EMAIL) {
    try {
      // Welcome email → new client
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: newUser.email,
        subject: "Welcome to Sprouto Go 🚀",
        html: clientWelcomeEmail({
          firstname: newUser.firstname,
          surname: newUser.surname,
          email: newUser.email,
          company: newUser.company,
        }),
      });

      // Notification email → admin
      if (process.env.ADMIN_EMAIL) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: process.env.ADMIN_EMAIL,
          subject: `New Client Registered - ${newUser.firstname} ${newUser.surname}`,
          html: adminNewUserEmail({
            firstname: newUser.firstname,
            surname: newUser.surname,
            email: newUser.email,
            company: newUser.company,
            address: newUser.address,
          }),
        });
      }
    } catch (emailErr) {
      console.error("🔥 Registration email error:", emailErr);
    }
  }

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
      accessToken,
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
      accessToken,
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

  const accessToken = req.cookies.accessToken;

  res.json({
    success: true,
    data: {
      accessToken,

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

      addonentitlementid:
        user.addonEntitlements?.map(a => a.addonId) || [],
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

// ================= FORGOT PASSWORD =================

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const user = await UserModel.findOne({ email });

  // 🔒 Do NOT reveal if user exists
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  }

  // ================= TOKEN GENERATION =================
  const resetToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins

  await user.save();

  // ================= RESET LINK =================
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  // ================= EMAIL HTML =================
  const html = forgotPasswordEmail({
    username: user.username || user.email,
    resetLink,
  });

  try {
    const resend = getResend();

    if (resend) {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: user.email,
        subject: "Reset Your Password 🔐",
        html,
      });

      if (result.error) {
        console.error("❌ Email failed:", result.error);

        // cleanup if email fails
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return res.status(500).json({
          success: false,
          message: "Failed to send reset email",
        });
      }

      console.log("✅ Email sent:", result.data);
    } else {
      // fallback (dev mode)
      console.log("📧 Simulated email:");
      console.log(resetLink);
    }

    // Optional dev-only visibility
    if (process.env.NODE_ENV === "development") {
      console.log("🔗 Reset link:", resetLink);
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("🔥 Unexpected error:", error);

    // cleanup if something crashes
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return res.status(500).json({
      success: false,
      message: "Failed to send reset email",
    });
  }
});

// ================= RESET PASSWORD =================
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  // ================= HASH TOKEN =================
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // ================= FIND USER =================
  const user = await UserModel.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Token is invalid or expired",
    });
  }

  // ================= UPDATE PASSWORD =================
  user.password = password;

  // clear reset fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  verifyMe,
  getAllUsers,
  forgotPassword,
  resetPassword,
};
