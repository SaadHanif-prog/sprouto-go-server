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


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

router.get("/", getRequests);

router.post("/", upload.single("file"), createRequest);

router.patch("/:id", updateRequest);

router.patch("/:id/assign", assignRequest);

router.delete("/:id", deleteRequest);

router.patch("/:requestId/complete", completeRequest)

module.exports = router;
