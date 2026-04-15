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
  { timestamps: true },
);

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, required: true }, // ← Cloudinary public_id (for deletion)
    original_name: { type: String }, // ← original filename
    mimetype: { type: String }, // ← e.g. "image/png", "application/pdf"
    size: { type: Number }, // ← size in bytes
  },
  { _id: true, timestamps: true }, // ← _id: true so each attachment has its own ID
);

const requestSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: false,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

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

    messages: [messageSchema],
    attachments: [attachmentSchema],

    lastRemindedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Request", requestSchema);
