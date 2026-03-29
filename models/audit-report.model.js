const mongoose = require("mongoose");

const pageBreakdownSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    health: { type: Number, required: true },
    keyword: { type: String, required: true },
    status: { type: String, enum: ["Good", "Needs Work", "Critical"], required: true },
  },
  { _id: false }
);

const auditReportSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    healthScore: { type: Number, required: true },
    organicTraffic: { type: Number, required: true }, 
    criticalIssues: { type: Number, required: true },
    trendingKeywords: [{ type: String }],
    pageBreakdown: [pageBreakdownSchema],
    runsUsed: { type: Number, default: 1 },
    lastRunMonth: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditReport", auditReportSchema);