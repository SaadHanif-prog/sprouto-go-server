const { body } = require("express-validator");

const validateRegisterUser = [
  body("role")
    .optional()
    .isIn(["admin", "client", "superadmin"])
    .withMessage("Invalid role"),

  // Title
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isIn(["Mr", "Mrs", "Ms", "Miss", "Dr", "Other"])
    .withMessage("Invalid title"),

  // Firstname
  body("firstname")
    .notEmpty()
    .withMessage("Firstname is required")
    .isString()
    .withMessage("Firstname must be a string"),

  // Surname
  body("surname")
    .notEmpty()
    .withMessage("Surname is required")
    .isString()
    .withMessage("Surname must be a string"),

  // Email
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .normalizeEmail(),

  // Password
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  // Company
  body("company.name")
    .notEmpty()
    .withMessage("Company name is required"),

  body("company.number")
    .notEmpty()
    .withMessage("Company number is required"),

  // Address
  body("address.line1")
    .notEmpty()
    .withMessage("Address line1 is required"),

  body("address.county")
    .notEmpty()
    .withMessage("County is required"),

  body("address.city")
    .notEmpty()
    .withMessage("City is required"),

  body("address.postcode")
    .notEmpty()
    .withMessage("Postcode is required"),

  // Subscription
  body("subscription.plan")
    .notEmpty()
    .withMessage("Subscription plan is required")
    .isIn(["starter", "pro"])
    .withMessage("Invalid subscription plan"),

  body("subscription.billingCycle")
    .notEmpty()
    .withMessage("Billing cycle is required")
    .isIn(["monthly", "annually"])
    .withMessage("Invalid billing cycle"),
];

// Validation middleware for logging in a user
const validateLoginUser = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

module.exports = {
  validateRegisterUser,
  validateLoginUser,
};