const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("#config/cloudinary");
const Request = require("#models/request.model"); // ← import your Request model

const app = express();

/* ---------------- MULTER SETUP ---------------- */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/* ---------------- CONTROLLER ---------------- */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ✅ requestId can be passed as query param or body field
    const requestId = req.query.requestId || req.body.requestId;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "uploads",
          resource_type: "auto",
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(error);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const fileData = {
      original_name: req.file.originalname,
      mimetype:      req.file.mimetype,
      size:          req.file.size,
      url:           result.secure_url,
      public_id:     result.public_id,
      format:        result.format,
      resource_type: result.resource_type,
      bytes:         result.bytes,
    };

    // ✅ If a requestId was provided, push the attachment into the Request document
    if (requestId) {
      const updated = await Request.findByIdAndUpdate(
        requestId,
        {
          $push: {
            attachments: {
              url:           fileData.url,
              public_id:     fileData.public_id,
              original_name: fileData.original_name,
              mimetype:      fileData.mimetype,
              size:          fileData.size,
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }
    }

    res.status(200).json({
      success: true,
      requestId: requestId || null,
      file: fileData,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


/* ---------------- EXPORTS ---------------- */
module.exports = {
  upload,
  uploadFile,
};