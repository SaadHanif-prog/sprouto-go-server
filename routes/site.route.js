const express = require("express");
const router = express.Router();

const {
  getSites,
  createSite,
} = require("#controllers/sites.controller");

const authMiddleware = require("#middlewares/auth.middleware");

/**
 * @route GET /api/sites
 * @desc Get all user sites
 */
router.get(
  "/",
  authMiddleware,
  getSites
);

/**
 * @route POST /api/sites/create
 * @desc Create new site
 */
router.post(
  "/create",
  authMiddleware,
  createSite
);

module.exports = router;