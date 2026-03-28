const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["client", "admin", "developer"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    size: String,
    type: String,
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    // 👤 CLIENT (who created request)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 👨‍💻 ASSIGNED DEVELOPER (NEW)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },

    // 💬 CHAT SUPPORT
    messages: [messageSchema],

    // 📎 FILES
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);