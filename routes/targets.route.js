const express = require("express");
const router = express.Router();

const {
  getTargets,
  createTarget,
  updateTarget,
  deleteTarget,
} = require("#controllers/targets.controller");

router.get("/:siteId", getTargets);
router.post("/", createTarget);
router.put("/:id", updateTarget);
router.delete("/:id", deleteTarget);

module.exports = router;