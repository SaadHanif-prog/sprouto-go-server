const mongoose = require("mongoose");

const targetSchema = new mongoose.Schema(
  {
    siteId: {
      type: String,
      required: [true, "siteId is required"],
      index: true,
    },
    metric: {
      type: String,
      required: [true, "metric is required"],
      trim: true,
    },
    targetValue: {
      type: Number,
      required: [true, "targetValue is required"],
      min: [0, "targetValue must be non-negative"],
    },
    currentValue: {
      type: Number,
      default: 0,
      min: [0, "currentValue must be non-negative"],
    },
    unit: {
      type: String,
      required: [true, "unit is required"],
      trim: true,
    },
    month: {
      type: String,
      required: [true, "month is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Target", targetSchema);