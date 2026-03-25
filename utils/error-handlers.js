const { validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => `• ${error.msg}`)
      .join("\n");

    return res.status(400).json({
      success: false,
      message: errorMessages,
      data: null,
    });
  }

  next();
};

const handleGeneralErrors = (err, _req, res, _res) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    data: null,
  });
};

module.exports = { handleValidationErrors, handleGeneralErrors };
