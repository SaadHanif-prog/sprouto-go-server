const express = require("express");
const router = express.Router();

const {
  getRequests,
  createRequest,
  updateRequest,
  deleteRequest,
  assignRequest
} = require("#controllers/request.controller");

const authMiddleware = require("#middlewares/auth.middleware");

/**
 * @route GET /api/requests
 * @desc Get requests (Admin: all, Client: by site)
 */
router.get(
  "/",
  authMiddleware,
  getRequests
);

/**
 * @route POST /api/requests
 * @desc Create new request
 */
router.post(
  "/",
  authMiddleware,
  createRequest
);

/**
 * @route PATCH /api/requests/:id
 * @desc Update request (client edits)
 */
router.patch(
  "/:id",
  authMiddleware,
  updateRequest
);

/**
 * @route PATCH /api/requests/:id/assign
 * @desc Assign developer (ADMIN ONLY)
 */
router.patch(
  "/:id/assign",
  authMiddleware,
  assignRequest
);

/**
 * @route DELETE /api/requests/:id
 * @desc Delete request
 */
router.delete(
  "/:id",
  authMiddleware,
  deleteRequest
);

module.exports = router;