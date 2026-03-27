const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ✅ Link to user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional fields (future ready)
    plan: {
      type: String,
      enum: ["starter", "pro"],
    },

    liveUrl: {
      type: String,
      trim: true,
    },

    gaMeasurementId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate sites per user
siteSchema.index({ userId: 1, url: 1 }, { unique: true });

const Site = mongoose.model("Site", siteSchema);

module.exports = Site;