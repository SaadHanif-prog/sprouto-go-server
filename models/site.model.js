const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
  {
    //  NEW: Site name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    //  Link to user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      required: true,
      enum: ["starter", "pro"],
    },

    entitlementId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Optional fields (future ready)
    liveUrl: {
      type: String,
      trim: true,
    },

    gaMeasurementId: {
      type: String,
      trim: true,
    },

    gaPropertyId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

//  Prevent duplicate sites per user
siteSchema.index({ userId: 1, url: 1 }, { unique: true });

// speed up entitlement queries
siteSchema.index({ entitlementId: 1 });

const Site = mongoose.model("Site", siteSchema);

module.exports = Site;
