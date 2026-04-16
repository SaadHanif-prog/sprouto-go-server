const express = require("express");
const router = express.Router();

const {
    getMyInvoices
} = require("#controllers/invoice.controller");



router.get("/", getMyInvoices);

module.exports = router;
