const express = require("express");
const router = express.Router();

const {
  getSites,
  getAllSites,
  createSite,
  updateSiteSettings,
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
 * @route GET /api/sites
 * @desc Get all sites
 */
router.get(
  "/all",
  authMiddleware,
  getAllSites
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

/**
 * @route PATCH /api/sites/:id/settings
 * @desc Update site live URL and property ID (Super Admin)
 */
router.patch(
  "/:id/settings",
  authMiddleware,
  updateSiteSettings
);

module.exports = router;