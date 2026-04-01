const express = require("express");
const router = express.Router();
const {upload, uploadFile} = require("#controllers/upload")


router.post("/", upload.single("file"), uploadFile);


module.exports = router;