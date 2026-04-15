const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  assignRequest,
  completeRequest
} = require("#controllers/request.controller");

const authMiddleware = require("#middlewares/auth.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.get("/", authMiddleware, getRequests);

router.post("/", authMiddleware, upload.single("file"), createRequest);

router.patch("/:id", authMiddleware, updateRequest);

router.patch("/:id/assign", authMiddleware, assignRequest);

router.delete("/:id", authMiddleware, deleteRequest);

router.patch("/:requestId/complete", authMiddleware, completeRequest)

module.exports = router;
